# -*- mode: python ; coding: utf-8 -*-

block_cipher = None
spec_root = os.path.abspath(SPECPATH)


a = Analysis(['api_server.py'],
             pathex=[spec_root],
             binaries=[],
             datas=[],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)

a.binaries = [ab for ab in a.binaries if not ab[0].startswith('mkl')]
exe = EXE(pyz,
          a.scripts,
          [],
          exclude_binaries=True,
          name='api_server',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          console=True )
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               upx_exclude=[],
               name='api_server')
