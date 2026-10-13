#!/usr/bin/env python3
"""Validate website release tags and replace the marked FTP website root."""
from __future__ import annotations

import argparse
from ftplib import FTP, all_errors
import os
from pathlib import Path, PurePosixPath
import re
import sys

MARKER = ".github_deployment_root"
STAGING = PurePosixPath("/.deployment")
# SemVer 2.0.0: numeric identifiers cannot have leading zeroes, except metadata.
NUMBER = r"(?:0|[1-9][0-9]*)"
PRERELEASE = rf"(?:{NUMBER}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)"
TAG = re.compile(
    rf"v{NUMBER}\.{NUMBER}\.{NUMBER}"
    rf"(?:-{PRERELEASE}(?:\.{PRERELEASE})*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
)


def validate_tag(tag: str) -> None:
    if not TAG.fullmatch(tag):
        raise ValueError("Expected a v<SemVer> tag, for example v1.2.3")


def protected(path: PurePosixPath) -> bool:
    return path.parts[0] in ("_imports", STAGING.name) or any(
        part == MARKER or part == ".user.ini"
        or part.startswith(".ht")
        for part in path.parts
    )


def validate_name(name: str) -> None:
    if not name or name in (".", "..") or any(c in name for c in "/\\\r\n\x00"):
        raise ValueError(f"Unsafe deployment entry: {name!r}")


def local_files(source: Path) -> list[tuple[Path, PurePosixPath]]:
    if not source.is_dir() or source.is_symlink():
        raise ValueError("Website build directory is missing or is a symlink")
    files = []

    def visit(directory: Path) -> None:
        for entry in sorted(directory.iterdir()):
            relative = PurePosixPath(entry.relative_to(source).as_posix())
            validate_name(entry.name)
            if protected(relative):
                continue
            if entry.is_symlink():
                raise ValueError(f"Build contains a symlink: {relative}")
            if entry.is_dir():
                visit(entry)
            elif entry.is_file():
                # Check readability before deleting any remote files.
                with entry.open("rb"):
                    pass
                files.append((entry, relative))
            else:
                raise ValueError(f"Unsupported build entry: {relative}")

    visit(source)
    index = source / "index.html"
    if not index.is_file() or index.stat().st_size == 0:
        raise ValueError("Website build must contain a nonempty index.html")
    return files


def remote_entries(ftp: FTP, directory: PurePosixPath) -> dict[str, str]:
    entries = {}
    # MLSD supplies types and includes dotfiles; fail closed if unsupported.
    for name, facts in ftp.mlsd(str(directory)):
        kind = facts.get("type", "")
        if kind in ("cdir", "pdir"):
            continue
        validate_name(name)
        if name in entries:
            raise ValueError(f"Duplicate FTP entry in {directory}: {name}")
        entries[name] = kind
    return entries


def verify_marker(ftp: FTP) -> dict[str, str]:
    root = PurePosixPath("/")
    entries = remote_entries(ftp, root)
    if entries.get(MARKER) != "file":
        raise ValueError(f"FTP root must contain the marker file /{MARKER}; deployment aborted")
    # Verify the marker is readable without logging its contents.
    ftp.retrbinary(f"RETR /{MARKER}", lambda _: None)
    return entries


def tree_deletion_plan(
    ftp: FTP, directory: PurePosixPath
) -> tuple[list[PurePosixPath], list[PurePosixPath]]:
    files, directories = [], []

    def visit(path: PurePosixPath) -> None:
        for name, kind in sorted(remote_entries(ftp, path).items()):
            child = path / name
            if kind == "file":
                files.append(child)
            elif kind == "dir":
                visit(child)
                directories.append(child)
            else:
                raise ValueError(f"Unsupported FTP entry type at {child}: {kind!r}")

    visit(directory)
    return files, directories


def prepare_staging(ftp: FTP, root_entries: dict[str, str]) -> None:
    """Clear only a previous staging area, then create an empty one."""
    kind = root_entries.get(STAGING.name)
    if kind == "file":
        ftp.delete(str(STAGING))
    elif kind == "dir":
        files, directories = tree_deletion_plan(ftp, STAGING)
        for path in files:
            ftp.delete(str(path))
        for path in directories:
            ftp.rmd(str(path))
        ftp.rmd(str(STAGING))
    elif kind is not None:
        raise ValueError(f"Unsupported FTP entry type at {STAGING}: {kind!r}")
    ftp.mkd(str(STAGING))


def cleanup_plan(ftp: FTP) -> tuple[list[PurePosixPath], list[PurePosixPath], set[PurePosixPath]]:
    root = PurePosixPath("/")
    entries = verify_marker(ftp)
    files, directories, retained = [], [], {root}

    def visit(directory: PurePosixPath, children: dict[str, str]) -> bool:
        keep = False
        for name, kind in sorted(children.items()):
            if directory == root and name == STAGING.name:
                continue
            path = directory / name
            if protected(path.relative_to(root)):
                keep = True
            elif kind == "file":
                files.append(path)
            elif kind == "dir":
                if visit(path, remote_entries(ftp, path)):
                    retained.add(path)
                    keep = True
                else:
                    directories.append(path)
            else:
                raise ValueError(f"Unsupported FTP entry type at {path}: {kind!r}")
        return keep

    # Inventory the entire live site before deleting any of it.
    visit(root, entries)
    return files, directories, retained


def deploy(ftp: FTP, source: Path) -> None:
    uploads = local_files(source)
    ftp.cwd("/")
    # Check the guard before replacing or creating the staging directory.
    root_entries = verify_marker(ftp)
    prepare_staging(ftp, root_entries)
    staging_directories = {PurePosixPath("/"), STAGING}
    for local, relative in uploads:
        destination = STAGING / relative
        for directory in reversed(destination.parents):
            if directory not in staging_directories:
                ftp.mkd(str(directory))
                staging_directories.add(directory)
        with local.open("rb") as content:
            ftp.storbinary(f"STOR {destination}", content)
    # Inventory and validate the live site only after every staged upload succeeds.
    files, directories, retained = cleanup_plan(ftp)
    for _, relative in uploads:
        if PurePosixPath("/") / relative in retained:
            raise ValueError(f"Build file conflicts with a preserved FTP directory: {relative}")
    print(f"Staging complete; removing {len(files)} live files and {len(directories)} directories", flush=True)
    for path in files:
        ftp.delete(str(path))
    for path in directories:
        ftp.rmd(str(path))
    for _, relative in uploads:
        source_path = STAGING / relative
        destination = PurePosixPath("/") / relative
        for directory in reversed(destination.parents):
            if directory not in retained:
                ftp.mkd(str(directory))
                retained.add(directory)
        ftp.rename(str(source_path), str(destination))
    for directory in sorted(staging_directories - {PurePosixPath("/"), STAGING},
                            key=lambda path: len(path.parts), reverse=True):
        ftp.rmd(str(directory))
    ftp.rmd(str(STAGING))
    print(f"Deployed {len(uploads)} website files to FTP /", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("validate-tag").add_argument("tag")
    commands.add_parser("deploy").add_argument("source", type=Path)
    arguments = parser.parse_args()
    if arguments.command == "validate-tag":
        validate_tag(arguments.tag)
        return
    credentials = {}
    for name in ("HOST", "PASSWORD", "PORT", "USER"):
        key = f"DESTINATION_FTP_{name}"
        value = os.environ.get(key)
        if not value:
            raise ValueError(f"Missing environment secret: {key}")
        credentials[name] = value
    port = int(credentials["PORT"])
    if not 1 <= port <= 65535:
        raise ValueError("DESTINATION_FTP_PORT must be between 1 and 65535")
    # Validate the artifact before connecting. FTP uses passive data connections.
    local_files(arguments.source)
    with FTP(timeout=30) as ftp:
        ftp.connect(credentials["HOST"], port)
        ftp.login(credentials["USER"], credentials["PASSWORD"])
        deploy(ftp, arguments.source)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, *all_errors) as error:
        print(f"Website deployment failed: {error}", file=sys.stderr)
        sys.exit(1)
