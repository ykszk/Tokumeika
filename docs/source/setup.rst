セットアップ
============

ダウンロード
------------

`配布サイト <https://github.com/yk-szk/Tokumeika/releases>`_ から最新版の ``tokumeika-manager-XXX-win32-x64.zip`` をダウンロードする

.. figure:: images/download.jpg

   最新版をダウンロードする。

展開
-----
ダウンロードしたzipファイルを展開。

初期設定
--------
アプリと同じフォルダ内の ``config/config.toml`` を編集して初期設定を行う。
`prefix = 'ANON'` を`prefix = 'OUH'` 等に変更する。

メモ帳での編集方法
*******************
* 設定ファイル ``config/config.toml`` を右クリック。
* :guilabel:`プログラムから開く` をクリック
* :guilabel:`その他のアプリ` をクリック
* メモ帳を選択して :guilabel:`OK` をクリック

項目
******

prefix
   匿名化後の患者IDにつける接頭辞。
   例：prefixがANONの場合は匿名化後の患者ID及び患者名はANON0001からの連番になる。

dicom
   匿名化後のDICOM画像を保存するフォルダ

private
   匿名化時に削除・置換された情報を保存するフォルダ

export
   送付用のデータを保存するフォルダ


フォルダの詳細は :doc:`data` 参照。


初回起動
--------
初回起動時に画像のような画面が表示された場合は、:guilabel:`詳細情報→実行` をクリックしてアプリを許可する。

.. figure:: images/smart_screen.jpg

   初回起動時にアプリがブロックされる場合がある。


.. figure:: images/smart_screen_jikko.jpg

   :guilabel:`詳細情報→実行` をクリックしてアプリを許可する。


「このアプリの機能のいくつかがwindows defenderファイアウォールでブロックされています」と表示された場合はキャンセルをクリック。