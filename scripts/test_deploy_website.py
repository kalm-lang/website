"""Safety gates for the destructive website FTP deployment."""
from ftplib import error_perm, error_temp
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

from deploy_website import MARKER, deploy, validate_tag


class WebsiteDeploymentTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.source = Path(self.temporary.name)
        (self.source / "index.html").write_text("new website")
        self.ftp = Mock()
        self.ftp.mlsd.return_value = [(MARKER, {"type": "file"}), ("old.html", {"type": "file"})]

    def assert_no_writes(self) -> None:
        for method in (self.ftp.delete, self.ftp.rmd, self.ftp.mkd, self.ftp.storbinary):
            method.assert_not_called()

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

    def test_missing_or_directory_marker_aborts(self) -> None:
        for kind in (None, "dir"):
            self.ftp.mlsd.return_value = [] if kind is None else [(MARKER, {"type": kind})]
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, "marker file"):
                deploy(self.ftp, self.source)
            self.assert_no_writes()

    def test_unreadable_marker_aborts(self) -> None:
        self.ftp.retrbinary.side_effect = error_perm("550 Permission denied")
        with self.assertRaises(error_perm):
            deploy(self.ftp, self.source)
        self.assert_no_writes()

    def test_listing_failure_aborts_before_deleting_anything(self) -> None:
        self.ftp.mlsd.side_effect = [
            [(MARKER, {"type": "file"}), ("old.html", {"type": "file"}), ("z", {"type": "dir"})],
            error_temp("450 Listing failed"),
        ]
        with self.assertRaises(error_temp):
            deploy(self.ftp, self.source)
        self.assert_no_writes()

    def test_unsupported_ftp_listing_aborts(self) -> None:
        self.ftp.mlsd.side_effect = error_perm("502 MLSD not supported")
        with self.assertRaises(error_perm):
            deploy(self.ftp, self.source)
        self.assert_no_writes()

    def test_unsafe_remote_entries_abort(self) -> None:
        for name, kind in (("../outside", "file"), ("/outside", "dir"),
                           ("file\nDELE /index.html", "file"), ("link", "OS.unix=slink"),
                           ("unknown", "")):
            self.ftp.mlsd.return_value = [(MARKER, {"type": "file"}), (name, {"type": kind})]
            with self.subTest(name=name), self.assertRaises(ValueError):
                deploy(self.ftp, self.source)
            self.assert_no_writes()

    def test_invalid_build_aborts_before_ftp_access(self) -> None:
        for content in (None, ""):
            index = self.source / "index.html"
            if content is None:
                index.unlink()
            else:
                index.write_text(content)
            with self.subTest(content=content), self.assertRaises(ValueError):
                deploy(self.ftp, self.source)
            self.ftp.cwd.assert_not_called()
            self.assert_no_writes()

    def test_build_symlink_aborts_before_ftp_access(self) -> None:
        (self.source / "link").symlink_to(self.source / "index.html")
        with self.assertRaisesRegex(ValueError, "symlink"):
            deploy(self.ftp, self.source)
        self.ftp.cwd.assert_not_called()
        self.assert_no_writes()

    def test_preserved_directory_file_conflict_aborts(self) -> None:
        (self.source / "docs").write_text("would replace a directory")
        self.ftp.mlsd.side_effect = [
            [(MARKER, {"type": "file"}), ("docs", {"type": "dir"})],
            [(".htaccess", {"type": "file"})],
        ]
        with self.assertRaisesRegex(ValueError, "preserved FTP directory"):
            deploy(self.ftp, self.source)
        self.assert_no_writes()

    def test_deployment_preserves_config_and_imports_including_upload_collisions(self) -> None:
        root = [(MARKER, {"type": "file"}), ("_imports", {"type": "dir"}),
                (".htaccess", {"type": "file"}), (".htaccess.backup", {"type": "file"}),
                (".htpasswd", {"type": "file"}), (".htusers", {"type": "file"}),
                (".htgroups", {"type": "file"}), (".htdigest", {"type": "file"}),
                (".user.ini", {"type": "file"}), ("old.html", {"type": "file"}),
                (".obsolete", {"type": "file"}), ("docs", {"type": "dir"}),
                ("stale", {"type": "dir"})]
        tree = {
            "/": root,
            "/docs": [(".htaccess", {"type": "file"}), ("old.html", {"type": "file"})],
            "/stale": [("nested", {"type": "dir"})],
            "/stale/nested": [("old.js", {"type": "file"})],
        }
        self.ftp.mlsd.side_effect = lambda path: tree[path]
        for name in (MARKER, ".htaccess", ".htaccess.backup", ".htpasswd", ".htusers",
                     ".htgroups", ".htdigest", ".user.ini"):
            (self.source / name).write_text("must never overwrite server config")
        (self.source / "_imports").mkdir()
        (self.source / "_imports/new.txt").write_text("must never overwrite imports")
        (self.source / "docs").mkdir()
        (self.source / "docs/new.html").write_text("new doc")
        (self.source / "assets").mkdir()
        (self.source / "assets/main.js").write_bytes(b"\x00\xffscript")
        uploaded = {}
        self.ftp.storbinary.side_effect = lambda command, stream: uploaded.update({command: stream.read()})
        deploy(self.ftp, self.source)
        self.ftp.cwd.assert_called_once_with("/")
        self.ftp.retrbinary.assert_called_once()
        self.assertEqual({call.args[0] for call in self.ftp.delete.call_args_list},
                         {"/old.html", "/.obsolete", "/docs/old.html", "/stale/nested/old.js"})
        self.assertEqual([call.args[0] for call in self.ftp.rmd.call_args_list],
                         ["/stale/nested", "/stale"])
        self.ftp.mkd.assert_called_once_with("/assets")
        self.assertEqual(uploaded, {"STOR /index.html": b"new website",
                                    "STOR /docs/new.html": b"new doc",
                                    "STOR /assets/main.js": b"\x00\xffscript"})

    def test_delete_failure_stops_before_upload(self) -> None:
        self.ftp.delete.side_effect = error_perm("550 Permission denied")
        with self.assertRaises(error_perm):
            deploy(self.ftp, self.source)
        self.ftp.storbinary.assert_not_called()

    def test_upload_failure_stops_immediately(self) -> None:
        (self.source / "z.html").write_text("second upload")
        self.ftp.storbinary.side_effect = error_temp("426 Connection closed")
        with self.assertRaises(error_temp):
            deploy(self.ftp, self.source)
        self.assertEqual(self.ftp.storbinary.call_count, 1)


if __name__ == "__main__":
    unittest.main()
