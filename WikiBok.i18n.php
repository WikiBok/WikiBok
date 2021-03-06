<?php
/**
 * Internationalisation file for the extension BokEditor.
 *
 * @addtogroup Extensions
 */

$messages = array();
$messages['ja'] = array(
	'specialpages-group-wikiboksystem' => 'WikiBokシステム',
	'bokeditor' => 'BokEditor',
	'descriptioneditor' => 'DescriptionEditor',
	'bokhistorylist' => 'BokXml更新履歴一覧',
	'boksavelist' => '保存済みBokXml一覧',

	'listviewer' => '[参照のみ]',
	
	'wbs-search-fieldset-title'=>'BokXml検索',
	'wbs-search-fieldset-fromto'=>'期間',
	'wbs-search-fieldset-fromdate'=>'開始',
	'wbs-search-fieldset-todate'=>'終了',
	'wbs-search-fieldset-year'=>'年',
	'wbs-search-fieldset-user'=>'利用者',
	'wbs-search-fieldset-savetitle'=>'登録タイトル',
	'wbs-search-fieldset-submit'=>'表示',

	'wbs-list-result-rev'=>'リビジョン番号',
	'wbs-list-result-user'=>'更新ユーザ',
	'wbs-list-result-time'=>'更新時刻',
	'wbs-list-result-link'=>'Bok表示',
	'wbs-list-result-savetitle'=>'登録名称',
	'wbs-list-result-comment'=>'コメント(一部抜粋)',
	'wbs-list-result-nodata'=>'条件に一致するデータがありません',

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
	'wikibok-saveuser' => '登録者',
	'wikibok-savetitle' => 'タイトル',

	'wikibok-error-usercreate-bad-userid' => 'このユーザ名は使用できません',
	'wikibok-error-usercreate-bad-userpass' => 'このパスワードは使用できません',
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
	'wikibok-icon-help' => '凡例表示',
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
		'defaultFocus' => false,
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
			'title'=>'データ登録',
			'loading'=>'作業中...',
			'end' => nl2br("登録作業が終了しました\n"),
			'conflict'=>array(
				'title' => '編集内容反映中',
				'no conflict' => '編集の競合はありませんでした',
				'heavy' => '重量マージが発生しました',
				'light' => '軽量マージが発生しました',
				'add' => '追加ノード一覧',
				'del' => '削除ノード一覧',
				'move' => '移動ノード一覧'
			),
			'represent' => array(
				'table' => array(
					'mark' => '判定',
					'source'=>'代表',
					'target'=>'従属'
				),
				'ok' => '○',
				'ng' => '×',
				'title' => '代表表現変更内容',
				'bodyng' => 'の変更は、代表表現が循環してしまうため、追加されませんでした',
				'bodyok' => 'の変更は、可能な限り追加しています。しかし、BOKツリーのマージ結果を優先しているため、一部反映されていない可能性があります',
				'bodyend'=> 'リンクの詳しい状況は「DescriptionEditor」で確認してください',
				'bodystart' => '以下の、代表表現を追加しました',
				'clear' => '',
			),
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
			'bok'=>array(
				'headline1'=>'追加対象ノード名称',
				'headline2'=>'新規ノード名称',
				'headline3'=>'記事内容',
				'button' => array(
					'text' => 'ノード作成',
					'title' => '新しいBOKノードを作成します',
					'class' => 'commit',
				),
				'button_create' => array(
					'text' => 'ノード作成',
					'title' => '新しいBOKノードを作成します',
					'class' => 'commit',
				),
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
				'already'=>'すでに同じ名前の記事があります',
				'nobody'=>nl2br("記事の内容が書かれていません。\n新規作成では必須入力です"),
			),
		),
		'wikibok-edit-description' => array(
			'error' => array(
				'emptypage' => '新規記事の場合、記事内容は必須入力です'
			),
		),
		'wikibok-move-node' => array(
			'title' => '移動'
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
				'norename' => '変更前ノード名称と同じ名称です',
				'already' => 'すでに同じ名前のノードがあります',
				'different' => nl2br("すでに同じ名前の記事があります\n名称変更はできません"),
			)
		),
		'wikibok-add-topic' => array(
			'title' => 'TOPICノード追加',
			'table_title' => '追加エラーノード名称',
			'error' => array(
				'others'=>'予期せぬエラーが発生しました',
				'param_error'=>'SMW-LINK(TOPIC)に使用するリンク名称が設定されていません',
				'no_smw_links'=>'対象ノードには、SMW-LINK(TOPIC)が存在しません',
				'no_add_topics'=>nl2br("追加できるSMW-LINK(TOPIC)が存在しません\nすべて追加済みの可能性があります"),
			),
		),
		//participant
		'wikibok-represent-node' => array(
			'title' => '代表表現選択',
			'headline1' => '代表ノード名称',
			'headline2' => '従属ノード名称',
			'caution' => '[従属ノードが選択されていません]',
			'error' => array(
				'depth'=>'同じ階層にないノードは選択できません',
				'parent'=>'親ノードが異なるため、選択できません',
				'already'=>'すでに選択されています',
				'equal'=>'代表ノードとして選択済みです',
				'noselect'=>nl2br("従属ノードが選択されていません\n処理を中止します"),
			),
			'button' => array(
				'text' => '実行',
				'title' => 'ノード名称を変更します',
				'class' => 'commit',
			),
		),
		'wikibok-description-addnode' => array(
			'title' => '追加ノード選択',
			'headline1' => '追加先ノード名称',
			'headline2' => '追加ノード名称',
			'caution' => '[追加ノードが選択されていません]',
			'error' => array(
				'parents'=>'すでに選択されています',
				'already'=>'すでに選択されています',
				'represent'=>'代表表現は追加できません',
				'noselect'=>nl2br("追加ノードが選択されていません\n処理を中止します"),
			),
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
				'view' => '記事内容表示',
				'addnode' => 'BOKツリーへ追加',
				'delete' => '記事削除',
				'rename' => '記事名称変更',
				'represent' => '代表表現へ置き換え',
			),
			'bok' => array(
				'edge-delete' => '親ノードとのリンクを解除',
				'node-delete' => 'これ以下のノードをすべて削除',
				'only-delete' => 'このノードのみを削除',
				'find-parent' => '親ノードを探す',
				'find-childs' => '子ノードを探す',
				'node-create' => 'このノードに子ノードを追加',
				'add-topic' => 'TOPICリンク先ノードを追加',
			)
		),
		'wikibok-search' => array(
			'title' => '検索結果',
			'noinput'=>'条件なし',
			'error' => array(
				'nodata' => 'ノードが見つかりません。',
			),
			'button_changecolor' => array(
				'text' => '強調',
				'title' => '検索結果を色づけします',
				'class'=>'commit',
			),
		),
		'wikibok-edittool' => array(
			'help' => array(
				'normal'=>'記事内容あり',
				'empty'=>'記事内容なし',
				'bok'=>array(
					'title'=>'BOKツリー アイコン：凡例',
					'reps_rect'=>'展開済み・従属ノードあり',
					'rect'=>'展開済み・従属ノードなし',
					'reps_triangel'=>'折畳済み・従属ノードあり',
					'triangel'=>'折畳済み・従属ノードなし',
				),
			),
			'view' => array(
				'title' => '記事参照',
			),
			'edit' => array(
				'title' => '記事編集',
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
					'notitle' => '登録名称が入力されていません',
					'nocomment' => '登録理由／コメントが入力されていません',
					'duplication' => nl2br("登録名称が重複しています。\n別の名称を付けてください。"),
				),
				'title' => 'BOKデータ登録',
			),
			'search' => array(
				'parent' => 'の親ノードを探しています',
				'child' => 'の子ノードを探しています'
			),
			'fileselect'=>array(
				'title' => 'アップロード済みファイル一覧',
				'name' => 'ファイル名称',
				'link' => '確認',
				'info' => '情報',
				'mark' => '○',
				'error'=>array(
					'nofile' => 'アップロード済みのファイルがありません'
				),
			),
			'button_commit' => array(
				'text' => '保存',
				'title' => '編集を保存',
				'class' => 'commit'
			)
		),
		'wikibok-viewer'=>array(
			'title'=>'データ参照',
			'error'=>array(
				'nodescription'=>nl2br("記事情報が保存されていません。\n最新情報を参照しています。")
			),
		),
		'wikibok-description' => array(
			'empty' => '現在このページには内容がありません'
		),
		'wikibok-empty-article' => "WikiBOKシステムによって自動生成されました。\n\n編集時は、この文章を上書きしてください。"
	)),
);
$messages['en'] = array(
	'specialpages-group-wikiboksystem' => 'WikiBok Systems',
	'bokeditor' => 'BokEditor',
	'descriptioneditor' => 'DescriptionEditor',

	'bokhistorylist' => 'BokXml更新履歴一覧',
	'boksavelist' => '保存済みBokXml一覧',
	'wbs-search-fieldset-title'=>'BokXml検索',
	'wbs-search-fieldset-fromto'=>'期間',
	'wbs-search-fieldset-fromdate'=>'開始',
	'wbs-search-fieldset-todate'=>'終了',
	'wbs-search-fieldset-year'=>'年',
	'wbs-search-fieldset-user'=>'利用者',
	'wbs-search-fieldset-savetitle'=>'登録タイトル',
	'wbs-search-fieldset-submit'=>'表示',
	'wbs-list-result-rev'=>'リビジョン番号',
	'wbs-list-result-user'=>'更新ユーザ',
	'wbs-list-result-time'=>'更新時刻',
	'wbs-list-result-link'=>'Bok表示',
	'wbs-list-result-savetitle'=>'登録名称',
	'wbs-list-result-comment'=>'コメント(一部抜粋)',
	'wbs-list-result-nodata'=>'条件に一致するデータがありません',
	'wikibok-message' => $messages['ja']['wikibok-message'],
);
