<?php
/**
 * Internationalisation file for the extension BokEditor.
 *
 * @addtogroup Extensions
 */

$messages = array();
$messages['en'] = array(
	'specialpages-group-wikiboksystem' => 'WikiBok Systems',
	'bokeditor' => 'BokEditor',
	'descriptioneditor' => 'DescriptionEditor',
	'wikibok-message' => serialize(array('')),
);

$messages['ja'] = array(
	'specialpages-group-wikiboksystem' => 'WikiBokシステム',
	'bokeditor' => 'BokEditor',
	'descriptioneditor' => 'DescriptionEditor',

	'wikibok-popupLogin-user' => 'ユーザ名',
	'wikibok-popupLogin-pass' => 'パスワード',
	'wikibok-popupLogin-remine' => 'パスワードを変更したい場合',
	'wikibok-popupLogin-newuser' => '新規ユーザを追加する場合',
	'wikibok-popupLogin-here' => 'こちらをクリック',
	'wikibok-popupLogin-repass' => 'パスワード(再入力)',
	'wikibok-popupLogin-mail' => 'メールアドレス',
	'wikibok-popupLogin-realname' => '氏名',
	'wikibok-popupLogin-new-pass' => '新しいパスワード',
	'wikibok-basename' => 'BASE',
	'wikibok-headname' => 'HEAD',
	'wikibok-viewname' => 'VIEW',
	'wikibok-revisionname' => 'REV',
	'wikibok-editcount' => '編集回数',

	'wikibok-error-usercreate-already' => nl2br("このユーザ名は、すでに使用されています。\n別のユーザ名をご利用下さい。"),

	'wikibok-search-start' => '検索開始',
	'wikibok-search-prev' => '前を検索',
	'wikibok-search-next' => '次を検索',
	'wikibok-search-text' => '検索文字列',
	'wikibok-search-list' => '検索結果一覧',
	'wikibok-searchresult-title' => '検索結果',
	'wikibok-dialog-reset' => 'ダイアログを画面内に整列',

	'wikibok-pager-first' => '先頭',
	'wikibok-pager-prev' => '前',
	'wikibok-pager-view' => '表示中ページ/ページ数',
	'wikibok-pager-next' => '次',
	'wikibok-pager-last' => '終端',

	'wikibok-select-cancel' => '探すことをやめますか？',
	'wikibok-add-newnode' => '新規ノード追加',
	'wikibok-add-article' => '新規記事追加',
	'wikibok-bokxml-commit' => '編集内容をサーバへ送信(自動マージ)',
	'wikibok-pdf-download' => '表示中のグラフをPDF形式でダウンロード',
	'wikibok-bokxml-save' => '表示中のBOK-XMLに名前を付けて保存',
	'wikibok-bokxml-undo' => 'BOK-XMLへの変更を１つ戻す',
	'wikibok-bokxml-redo' => 'BOK-XMLへの変更をやり直す',
	'wikibok-conflict-head' => '最新記事',
	'wikibok-conflict-work' => 'あなたの投稿内容',
	'' => '',

	'wikibok-article-title' => '記事名称',
	'wikibok-article-summary' => '記事内容',
	'wikibok-smwlink_sample' => 'リンク名称::記事名称|記事表示',
	'wikibok-smwlink_tip' => 'SMWリンク(記事の関連付け)',
	'' => '',
	
	//Javascriptで利用する文字列の設定
	'wikibok-message' => serialize(array(
		'common' => array(
			'success' => '成功',
			'error' => '失敗',
			'caution' => '警告',
			'check' => '確認',
			'button_ok' => array(
				'text' => 'OK',
				'title' => '確認しました',
				'class' => 'commit'
			),
			'button_close' => array(
				'text' => '閉じる',
				'title' => 'ダイアログを閉じる',
				'class' => 'close'
			),
			'button_yes' => array(
				'text' => 'はい',
				'title' => '処理を続行します',
				'class'=>'commit'
			),
			'button_no' => array(
				'text' => 'いいえ',
				'title' => '処理を中止します',
				'class'=>'cancel'
			),
			'button_edit' => array(
				'text' => '編集',
				'title' => '記事内容の編集を開始する',
				'class'=>'commit'
			),
			'button_cancel' => array(
				'text' => 'キャンセル',
				'title' => '処理を中止し、ダイアログを閉じる',
				'class'=>'cancel'
			),
			'connection_error' => 'サーバと通信できません'
		),
		'wikibok-merge' => array(
			'conflict'=>array(
				'title' => '編集内容反映中',
				'no conflict' => '編集の競合はありませんでした',
				'heavy' => '重量マージが発生しました',
				'light' => '軽量マージが発生しました',
				'add' => '追加ノード一覧',
				'del' => '削除ノード一覧',
				'move' => '移動ノード一覧'
			),
			'title'=>'データ登録',
			'loading'=>'作業中...',
			'end' => nl2br("登録作業が終了しました\n"),
			'error' => array(
				'busy' => nl2br("回線が混み合っています\n"),
				'findnewrev' => nl2br("新しいBOKデータが見つかりました\n"),
				'needlogin' => nl2br("ログインしてから編集をお願いします\n"),
				'newest' => nl2br("表示内容が最新状態です\n(更新の必要はありません)\n"),
				'nochange' => nl2br("変更内容は既に反映されています\n"),
				'noedit' => nl2br("編集されていません\n"),
				'nologin' => nl2br("ユーザ情報が確認できません\n"),
				'refreshdata' => nl2br("編集情報を破棄します\n"),
				'reload' => nl2br("表示を更新します\n"),
				'retry' => nl2br("時間をおいて、再度お試しください\n"),
				'senderror' => nl2br("通信障害が発生しています\n"),
			)
		),
		'wikibok-linkcaution' => array(
			'title' => '警告',
			'text' => nl2br(
				"このリンクは、画面が遷移します。\n".
				"現在作業中のデータは、サーバへ登録されていない可能性があります。\n".
				"サーバへ登録したい場合には、保存ボタンを押してください。\n".
				"このまま、画面を遷移してよろしいですか？"
			),
			'height' => 150,
			'width' => 400,
		),
		'wikibok-popupLogout' => array(
			'title' => 'ログアウト',
			'text' => nl2br("ログアウトに成功しました。\n情報を更新します。"),
		),
		'wikibok-popupLogin' => array(
			'title' => 'ログイン',
			'button1' => array(
				'text' => 'ログイン',
				'title' => 'ログインする',
				'class'=>'commit',
			),
			'success' => nl2br("ログインに成功しました。\n情報を更新します。"),
			'error' => array(
				'others' => nl2br("予期せぬエラーが発生しました\nシステム管理者に連絡してください。"),
				'emptyid' => nl2br("ユーザ名が入力されていません"),
				'emptypass' => nl2br("パスワードが入力されていません"),
				'notexists' => nl2br("入力された利用者は見当たりません。\n綴りが正しいことを確認するか、新たにアカウントを作成してください。"),
				'wrongpass' => nl2br("パスワードが間違っています。\n再度入力してください。"),
			),
		),
		'wikibok-change-password' => array(
			'title' => 'パスワード変更',
			'success'=>nl2br("パスワードの変更に成功しました。\n次回のログインより、新しいパスワードをご利用ください。"),
			'error' => array(
				'EmptyItem' => nl2br("未入力項目があります。\nすべて入力して下さい。"),
				'WrongPass' => nl2br("新しいパスワードが一致しません。\n再度入力して下さい。"),
			),
			'button' => array(
				'title' => '新しいパスワードに変更します',
				'text' => '変更',
				'class' => 'commit',
			)
		),
		'wikibok-create-user' => array(
			'title' => '新規ユーザ作成',
			'success' => nl2br("ユーザの作成に成功しました。\n次回のログインより、作成したユーザアカウントをご利用ください。"),
			'error' => array(
				'EmptyItem' => nl2br("未入力項目があります。\nすべて入力して下さい。"),
				'WrongPass' => nl2br("新しいパスワードが一致しません。\n再度入力して下さい。"),
			),
			'button' => array(
				'title' => '新しいユーザを作成します',
				'text'=>'作成',
				'class'=>'commit'
			)
		),
		'wikibok-new-element' => array(
			'title'=>'新規作成',
			'width' => 500,
			'height' => 300,
			'bok'=>array(
				'headline1'=>'追加対象ノード名称',
				'headline2'=>'新規ノード名称',
				'headline3'=>'記事内容',
				'button' => array(
					'text' => 'ノード作成',
					'title' => '新しいBOKノードを作成します',
					'class' => 'commit',
				)
			),
			'description' => array(
				'headline' => '新規記事名称',
				'button' => array(
					'text' => '記事作成',
					'title' => "新しい記事を作成します。\n続けて記事内容を入力して下さい",
					'class' => 'commit',
				)
			),
			'error' => array(
				'empty'=>'作成するノードの名称が入力されていません',
				'already'=>'すでに同じ名前の記事があります'
			),
		),
		'wikibok-rename-node' => array(
			'title' => 'ノード名称変更',
			'headline1' => '変更前ノード名称',
			'headline2' => '変更後ノード名称',
			'button' => array(
				'text' => '名称変更',
				'title' => 'ノード名称を変更します',
				'class' => 'commit',
			),
			'error' => array(
				'empty' => '変更後ノード名称が入力されていません',
				'already' => 'すでに同じ名前のノードがあります',
				'different' => nl2br("すでに同じ名前の記事があります\n名称変更はできません"),
			)
		),
		//participant
		'wikibok-represent-node' => array(
			'title' => '代表表現選択',
			'headline1' => '代表ノード名称',
			'headline2' => '従属ノード名称',
			'button' => array(
				'text' => '実行',
				'title' => 'ノード名称を変更します',
				'class' => 'commit',
			),
		),
		'wikibok-contextmenu' => array(
			'title' => '選択',
			'itemgroup' => array(
				'view' => '確認',
				'edit' => '編集',
				'special' => '特殊(追加)'
			),
			'description' => array(
				'width' => 300,
				'height' => 200,
				'view' => '記事内容表示',
				'add' => 'BOKツリーへ追加',
				'rename' => '記事名称変更',
				'searchsmw' => 'SMWリンク先ごとBOKツリーへ追加',
				'represent' => '代表表現へ置き換え',
			),
			'bok' => array(
				'edge-delete' => '親ノードとのリンクを解除',
				'node-delete' => 'これ以下のノードをすべて削除',
				'only-delete' => 'このノードのみを削除',
				'find-parent' => '親ノードを探す',
				'find-childs' => '子ノードを探す',
				'node-create' => 'このノードに子ノードを追加',
			)
		),
		'wikibok-search' => array(
			'title' => '検索結果',
			'error' => array(
				'nodata' => 'ノードが見つかりません。',
				'width' => 300,
				'height' => 200,
			),
			'button_changecolor' => array(
				'text' => '強調',
				'title' => '検索結果を色づけします',
				'class'=>'commit',
			),
		),
		'wikibok-edittool' => array(
			'view' => array(
				'title' => '記事参照',
				'height' => 500,
				'width' => 500
			),
			'edit' => array(
				'title' => '記事編集',
				'height' => 500,
				'width' => 500
			),
			'save_as' => array(
				'body' => array(
					'title' => '登録名称',
					'comment' => '登録理由／コメント',
				),
				'input' => array(
					'title' => '登録したデータを参照する名称を入力します',
					'comment' => '登録したデータの説明を入力します',
				),
				'button_commit' => array(
					'text' => '登録',
					'title' => 'データをサーバに登録します',
					'class' => 'commit',
				),
				'success' => nl2br("サーバに登録しました。\n参照URL:"),
				'error' => array(
					'duplication' => nl2br("登録名称が重複しています。\n別の名称を付けてください。"),
				),
				'width' => 400,
				'height' => 300,
				'title' => 'BOKデータ登録',
			),
			'search' => array(
				'parent' => 'の親ノードを探しています',
				'child' => 'の子ノードを探しています'
			),
			'fileselect'=>array(
				'title' => 'アップロード済みファイル一覧',
				'name' => 'ファイル名称',
				'link' => '確認用リンク',
				'info' => '情報',
				'direct' => '開く',
				'height' => 200,
				'width' => 300
			),
			'button_commit' => array(
				'text' => '保存',
				'title' => '編集を保存',
				'class' => 'commit'
			)
		),
		'wikibok-description' => array(
			'listview' => array(
				'empty' => '記事の内容が記述されていません'
			),
		),
		'wikibok-empty-article' => "WikiBOKシステムによって自動生成されました。\n\n編集時は、この文章を上書きしてください。"
	)),
);
