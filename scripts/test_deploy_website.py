"""Safety gates for the staged website FTP deployment."""
from ftplib import error_perm, error_temp
from pathlib import Path, PurePosixPath
import tempfile
import unittest

from deploy_website import MARKER, STAGING, deploy, validate_tag


class FakeFTP:
    """Small in-memory FTP tree that records mutations and supports failure injection."""

    def __init__(self, files: dict[str, bytes | None | str] | None = None):
        self.entries: dict[str, bytes | None | str] = {"/": None}
        for path, value in (files or {}).items():
            self.entries[path] = value
            parent = PurePosixPath(path).parent
            while str(parent) not in self.entries:
                self.entries[str(parent)] = None
                parent = parent.parent
        self.events: list[tuple[str, str]] = []
        self.fail_on: tuple[str, str] | None = None

    def _event(self, command: str, path: str) -> None:
        self.events.append((command, path))
        if self.fail_on == (command, path):
            raise error_temp(f"injected {command} failure at {path}")

    def cwd(self, path: str) -> None:
        self._event("cwd", path)

    def mlsd(self, directory: str):
        self._event("mlsd", directory)
        parent = str(PurePosixPath(directory))
        if parent not in self.entries or self.entries[parent] is not None:
            raise error_perm("550 Not a directory")
        entries = []
        for path, value in self.entries.items():
            child = PurePosixPath(path)
            if str(child.parent) != parent or path == parent:
                continue
            kind = "dir" if value is None else value if isinstance(value, str) else "file"
            entries.append((child.name, {"type": kind}))
        return entries

    def retrbinary(self, command: str, callback) -> None:
        self._event("retrbinary", command)
        path = command.removeprefix("RETR ")
        value = self.entries.get(path)
        if not isinstance(value, bytes):
            raise error_perm("550 Not a readable file")
        callback(value)

    def delete(self, path: str) -> None:
        self._event("delete", path)
        if not isinstance(self.entries.get(path), bytes):
            raise error_perm("550 Not a file")
        del self.entries[path]

    def rmd(self, path: str) -> None:
        self._event("rmd", path)
        if self.entries.get(path) is not None:
            raise error_perm("550 Not a directory")
        if any(PurePosixPath(child).parent == PurePosixPath(path) for child in self.entries if child != path):
            raise error_perm("550 Directory not empty")
        del self.entries[path]

    def mkd(self, path: str) -> None:
        self._event("mkd", path)
        if path in self.entries or str(PurePosixPath(path).parent) not in self.entries:
            raise error_perm("550 Directory exists or parent is missing")
        self.entries[path] = None

    def storbinary(self, command: str, stream) -> None:
        path = command.removeprefix("STOR ")
        self._event("storbinary", path)
        if str(PurePosixPath(path).parent) not in self.entries:
            raise error_perm("550 Parent directory is missing")
        self.entries[path] = stream.read()

    def rename(self, source: str, destination: str) -> None:
        self._event("rename", f"{source} -> {destination}")
        if not isinstance(self.entries.get(source), bytes):
            raise error_perm("550 Source is missing")
        if destination in self.entries or str(PurePosixPath(destination).parent) not in self.entries:
            raise error_perm("550 Destination exists or parent is missing")
        self.entries[destination] = self.entries.pop(source)


class WebsiteDeploymentTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.source = Path(self.temporary.name)
        (self.source / "index.html").write_text("new website")
        self.ftp = FakeFTP({
            f"/{MARKER}": b"deployment root",
            "/old.html": b"old website",
        })

    def assert_no_site_changes(self) -> None:
        self.assertFalse(any(command in {"delete", "rmd", "rename"}
                             and not path.startswith(str(STAGING))
                             for command, path in self.ftp.events))

    def test_semver_release_tags(self) -> None:
        for tag in ("website-0.0.0", "website-1.2.3", "website-10.20.30-rc.1",
                    "website-1.2.3-0", "website-1.2.3-01a", "website-1.2.3+build.001",
                    "website-1.2.3-beta.1+sha.abc"):
            with self.subTest(tag=tag):
                validate_tag(tag)
        for tag in ("v1.2.3", "website-v1.2.3", "website-1.2", "website-01.2.3",
                    "website-1.02.3", "website-1.2.03", "website-1.2.3-01",
                    "website-1.2.3-rc.01", "website-1.2.3-", "website-1.2.3+",
                    "website-1.2.3-a..b", "website-1.2.3\n", "website-1.2.3/other"):
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                validate_tag(tag)

    def test_missing_or_directory_marker_aborts_before_staging(self) -> None:
        for kind in (None, "dir"):
            files = {"/old.html": b"old website", "/.deployment/partial.html": b"partial"}
            if kind == "dir":
                files[f"/{MARKER}"] = None
            self.ftp = FakeFTP(files)
            before = self.ftp.entries.copy()
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, "marker file"):
                deploy(self.ftp, self.source)
            self.assertEqual(self.ftp.entries, before)
            self.assertFalse(any(command in {"delete", "rmd", "mkd", "storbinary", "rename"}
                                 for command, _ in self.ftp.events))

    def test_unreadable_marker_aborts_before_staging(self) -> None:
        self.ftp.fail_on = ("retrbinary", f"RETR /{MARKER}")
        before = self.ftp.entries.copy()
        with self.assertRaises(error_temp):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.entries, before)
        self.assertFalse(any(command in {"delete", "rmd", "mkd", "storbinary", "rename"}
                             for command, _ in self.ftp.events))

    def test_bad_staging_tree_aborts_before_changing_it(self) -> None:
        self.ftp.entries["/.deployment"] = None
        self.ftp.entries["/.deployment/link"] = "slink"
        before = self.ftp.entries.copy()
        with self.assertRaisesRegex(ValueError, "Unsupported FTP entry type"):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.entries, before)
        self.assert_no_site_changes()

    def test_listing_failure_leaves_live_site_untouched(self) -> None:
        self.ftp.entries["/z"] = None
        self.ftp.fail_on = ("mlsd", "/z")
        with self.assertRaises(error_temp):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.entries["/old.html"], b"old website")
        self.assert_no_site_changes()

    def test_unsupported_live_entry_aborts_without_deleting_site(self) -> None:
        self.ftp.entries["/link"] = "slink"
        with self.assertRaisesRegex(ValueError, "Unsupported FTP entry type"):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.entries["/old.html"], b"old website")
        self.assert_no_site_changes()

    def test_invalid_build_aborts_before_ftp_access(self) -> None:
        for content in (None, ""):
            self.ftp = FakeFTP({f"/{MARKER}": b"deployment root", "/old.html": b"old website"})
            index = self.source / "index.html"
            if content is None:
                index.unlink()
            else:
                index.write_text(content)
            with self.subTest(content=content), self.assertRaises(ValueError):
                deploy(self.ftp, self.source)
            self.assertFalse(self.ftp.events)

    def test_build_symlink_aborts_before_ftp_access(self) -> None:
        (self.source / "link").symlink_to(self.source / "index.html")
        with self.assertRaisesRegex(ValueError, "symlink"):
            deploy(self.ftp, self.source)
        self.assertFalse(self.ftp.events)

    def test_preserved_directory_file_conflict_keeps_live_site(self) -> None:
        (self.source / "docs").write_text("would replace a directory")
        self.ftp.entries["/docs"] = None
        self.ftp.entries["/docs/.htaccess"] = b"config"
        with self.assertRaisesRegex(ValueError, "preserved FTP directory"):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.entries["/old.html"], b"old website")
        self.assert_no_site_changes()

    def test_staging_upload_failure_keeps_live_site(self) -> None:
        (self.source / "assets").mkdir()
        (self.source / "assets/app.js").write_bytes(b"script")
        self.ftp.fail_on = ("storbinary", "/.deployment/assets/app.js")
        with self.assertRaises(error_temp):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.entries["/old.html"], b"old website")
        self.assertIn("/.deployment/assets", self.ftp.entries)
        self.assert_no_site_changes()

    def test_staging_deletes_old_stage_then_promotes_new_files_and_preserves_configs(self) -> None:
        self.ftp.entries.update({
            "/.deployment": None,
            "/.deployment/old": None,
            "/.deployment/old/stale.js": b"partial previous upload",
            "/_imports": None,
            "/_imports/data.txt": b"keep imports",
            "/.htaccess": b"root config",
            "/.user.ini": b"PHP config",
            "/.htgroups": b"Apache groups",
            "/docs": None,
            "/docs/.htpasswd": b"nested config",
            "/docs/stale.html": b"old doc",
            "/stale": None,
            "/stale/old.js": b"old asset",
            "/.obsolete": b"old dotfile",
        })
        for name in (MARKER, ".htaccess", ".user.ini", ".htgroups", ".htdigest"):
            (self.source / name).write_text("must never overwrite server config")
        (self.source / "_imports").mkdir()
        (self.source / "_imports/new.txt").write_text("must never overwrite imports")
        (self.source / "docs").mkdir()
        (self.source / "docs/new.html").write_text("new doc")
        (self.source / "assets").mkdir()
        (self.source / "assets/main.js").write_bytes(b"\x00\xffscript")

        deploy(self.ftp, self.source)

        expected = {
            "/": None,
            f"/{MARKER}": b"deployment root",
            "/_imports": None,
            "/_imports/data.txt": b"keep imports",
            "/.htaccess": b"root config",
            "/.user.ini": b"PHP config",
            "/.htgroups": b"Apache groups",
            "/docs": None,
            "/docs/.htpasswd": b"nested config",
            "/index.html": b"new website",
            "/docs/new.html": b"new doc",
            "/assets": None,
            "/assets/main.js": b"\x00\xffscript",
        }
        self.assertEqual(self.ftp.entries, expected)
        events = self.ftp.events
        marker_read = events.index(("retrbinary", f"RETR /{MARKER}"))
        first_stage_delete = events.index(("delete", "/.deployment/old/stale.js"))
        staging_created = events.index(("mkd", "/.deployment"))
        last_upload = max(i for i, event in enumerate(events)
                          if event[0] == "storbinary" and event[1].startswith("/.deployment/"))
        first_live_delete = next(i for i, event in enumerate(events)
                                 if event[0] == "delete" and not event[1].startswith("/.deployment/"))
        first_promotion = next(i for i, event in enumerate(events) if event[0] == "rename")
        stage_removed = max(i for i, event in enumerate(events) if event == ("rmd", "/.deployment"))
        self.assertLess(marker_read, first_stage_delete)
        self.assertLess(first_stage_delete, staging_created)
        self.assertLess(staging_created, last_upload)
        self.assertLess(last_upload, first_live_delete)
        self.assertLess(first_live_delete, first_promotion)
        self.assertLess(first_promotion, stage_removed)

    def test_stage_upload_failure_does_not_delete_live_files(self) -> None:
        (self.source / "z.html").write_text("second staged file")
        self.ftp.fail_on = ("storbinary", "/.deployment/z.html")
        with self.assertRaises(error_temp):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.entries["/old.html"], b"old website")
        self.assertFalse(any(command in {"delete", "rmd", "rename"}
                             and not path.startswith("/.deployment")
                             for command, path in self.ftp.events))


if __name__ == "__main__":
    unittest.main()
