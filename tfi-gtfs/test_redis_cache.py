"""Tests for the add-on's Redis cache compatibility check."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('check-redis-cache.sh')


class RedisCacheCheckTests(unittest.TestCase):
    def test_cache_check(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            tools = root / 'bin'
            tools.mkdir()
            checker = tools / 'redis-check-rdb'
            checker.write_text('''#!/bin/sh
case "$TEST_MODE" in
  ok) exit 0 ;;
  incompatible) echo "Can't handle RDB format version 12"; exit 1 ;;
  corrupt) echo "Checksum error"; exit 1 ;;
esac
''')
            checker.chmod(0o755)
            env = dict(os.environ, DATA_DIR=str(data), PATH=f"{tools}:{os.environ['PATH']}")
            for mode in ('ok', 'incompatible', 'corrupt'):
                with self.subTest(mode=mode):
                    db = data / 'dump.rdb'
                    db.write_bytes(b'original data')
                    result = subprocess.run(['sh', str(SCRIPT)], env=dict(env, TEST_MODE=mode),
                                            capture_output=True, text=True)
                    self.assertEqual(result.returncode, 1 if mode == 'corrupt' else 0)
                    if mode == 'incompatible':
                        self.assertFalse(db.exists())
                        backups = list(data.glob('dump.rdb.incompatible.*'))
                        self.assertEqual(len(backups), 1)
                        self.assertEqual(backups[0].read_bytes(), b'original data')
                    else:
                        self.assertEqual(db.read_bytes(), b'original data')

    def test_missing_cache_does_not_call_checker(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(['sh', str(SCRIPT)], env=dict(os.environ, DATA_DIR=directory),
                                    capture_output=True)
            self.assertEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
