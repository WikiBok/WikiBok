<?php
if(!defined("BOK_MERGER_BACKUP")) {
	define("BOK_MERGER_BACKUP",TRUE);
	define("BOK_MERGER_BACKUP_TARGET",dirname(__FILE__)."/");
	define("BOK_MERGER_BACKUP_FOLDER",dirname(__FILE__)."/backup/");
}
class MergerBackup {
	/**
	 * コンストラクタ
	 *  - バックアップフォルダを作成
	 */
	function __construct() {
		//バックアップフォルダが存在しない場合、作成する
		if(!file_exists(BOK_MERGER_BACKUP_FOLDER)) {
			mkdir(BOK_MERGER_BACKUP_FOLDER,0755);
		}
		return;
	}
	/**
	 * 使用したクラスファイルをバックアップする
	 * @param	$name	(String)対象ファイル名
	 * @param	$time	(int)バックアップ時刻(timestamp)
	 * @return	(Bool)	FALSE:バックアップ対象ファイルなし
	 *			(String)バックアップファイル名
	 */
	function make_backup($name,$time) {
		$from_file = BOK_MERGER_BACKUP_TARGET."{$name}";
		$backup_day = date("YmdHis",$time);
		$to_folder = BOK_MERGER_BACKUP_FOLDER."{$backup_day}/";
		$to_file = "{$to_folder}{$name}";
		if(!file_exists($from_file)) {
			//バックアップ対象ファイルが存在しない
			return FALSE;
		}
		//バックアップファイルは日時ごとのフォルダに分ける
		if(!file_exists($to_folder)) {
			//フォルダがない場合は作成する
			mkdir($to_folder,0755);
		}
		//バックアップファイルの有無を確認(重複作業の回避)
		if(file_exists($to_file)) {
			//すでにバックアップファイルが存在する
			return $name;
		}
		//バックアップファイルの作成(単純コピー)
		copy($from_file,$to_file);
		return $name;
	}
}
