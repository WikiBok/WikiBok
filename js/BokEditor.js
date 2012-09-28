jQuery(function($) {
	var
		dElem = $('body').get(0),
		bok,
		tid,
		pid,
		rid,
		depth,
		mode = 'normal',
		mode_mes,
		svg = $('#result').bok({
			w : 300,
			h : 30,
			success : function(r) {
			},
			polygonClick : function() {
				$.revision.editTree(true);
			},
			textClick : textClick,
			pathClick : function(d) {
				var
					tmp = '<dl class="content">'
						  + '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','edit')+'</dt>'
						  + '<dd class="command bokeditor-edge-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','edge-delete')+'</dd>'
						  + '</dl>';
				tid = d.target.name;
				if(wgLogin && wgEdit && wgAction != 'load') {
					context_dialog(tmp);
				}
			},
			node : {
				class : 'empty',
				func : function(d){
					return (($.wikibok.findDescriptionPage(d.name,false,true)).length < 1);
				}
			}
		});
	function context_dialog(tmp) {
		var
			_open = true;
		$.wikibok.exDialog(
			$.wikibok.wfMsg('wikibok-contextmenu','title'),
			'',
			{
				create : function() {
					var dialog = this;
					//各メニューのイベントを設定
					$(this)
						.on('click','.command',function(a,b) {
							$(dialog).dialog('close');
						})
						.on('click','.description-view',function(a,b){
							var
								_title = tid;
							$.wikibok.getDescriptionPage(_title,['links'])
							.done(function(dat) {
								var
									page = dat.parse,
									ptxt = $(page.text['*']),
									desc = (ptxt.html() == null) ? $('<div>'+$.wikibok.wfMsg('wikibok-description','empty')+'</div>') : ptxt;
									//リンクを別タブ(ウィンドウ)で開く
									desc.find('a').attr({target:'_blank'});
								$.wikibok.viewDescriptionDialog(_title,desc);
							})
							.fail(function() {
								alert('記事がない...');
							});
						})
						.on('click','.bokeditor-find-parent',function(a,b) {
							pid = tid;
							mode = 'parent';
						})
						.on('click','.bokeditor-find-childs' ,function(a,b) {
							pid = tid;
							mode = 'childs';
						})
						.on('click','.bokeditor-only-delete',function(a,b) {
							svg.delNode(tid,false);
						})
						.on('click','.bokeditor-node-delete',function(a,b) {
							svg.delNode(tid,true);
						})
						.on('click','.bokeditor-edge-delete',function(a,b) {
							delEdge(tid);
						})
						.on('click','.bokeditor-node-create',function(a,b) {
							createNewNode(tid);
						})
						.on('click','.bokeditor-rename',function(a,b) {
							renameNode(tid);
						})
						.on('click','.bokeditor-represent',function(a,b) {
							pid = {name : tid,depth : depth};
							rid = {};
							mode = 'represent';
							represent(pid.name);
						});
				},
				focus : function() {
					if(_open) {
						_open = false;
						$(this).html(tmp);
					}
				}
			}
		);
	}
	function delEdge(a) {
		var
			error = '';
		$.wikibok.requestCGI(
			'WikiBokJs::deleteEdgeRequest',
			[a],
			function(dat,stat,xhr) {
				if(dat.res == false) {
					error = dat.b;
				}
				return (dat.res != false);
			},
			function(xhr,stat,err) {
				error = ''
				return false;
			}
		)
		.done(function(dat) {
			svg.moveNode(a,'');
			$.revision.setRev(dat.res);
		})
		.fail(function() {
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-move-node','title')+' '+$.wikibok.wfMsg('common','error'),
				'',
				{
					focus : function(){
						$(this).html(error);
					}
				}
			);
		});
	}
	function moveNode(a,b) {
		var
			error = '';
		$.wikibok.requestCGI(
			'WikiBokJs::moveNodeRequest',
			[a,b],
			function(dat,stat,xhr) {
				if(dat.res == false) {
					error = dat.b;
				}
				return (dat.res != false);
			},
			function(xhr,stat,err) {
				error = ''
				return false;
			}
		)
		.done(function(dat) {
			svg.moveNode(a,b);
			$.revision.setRev(dat.res);
		})
		.fail(function() {
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-move-node','title')+' '+$.wikibok.wfMsg('common','error'),
				'',
				{
					focus : function(){
						$(this).html(error);
					}
				}
			);
		});
	}
	function textClick(d) {
		var
			tmp,
			_tmp,
			open = false;
		//対象ノードの名称を設定(ClickEventごとに変更の必要あり)
		tid = d.name;
		depth = d.depth;
		switch(mode) {
			//後から選択した方が親
			case 'parent':
				moveNode(pid,tid);
				mode = 'normal';
				break;
			//後から選択した方が子
			case 'childs':
				moveNode(tid,pid);
				mode = 'normal';
				break;
			//BOK上に表示しないノードを複数選択
			case 'represent':
				//除外
				if(rid.tid == undefined && tid != pid.name) {
					if(depth == pid.depth) {
						rid[tid] = {
							description : pid.name,
							smwlinkto : tid
						}
						represent(pid.name);
					}
					else {
						//5秒経過すると自動で閉じる
						$.wikibok.timePopup(
							$.wikibok.wfMsg('wikibok-represent-node','title'),
							$.wikibok.wfMsg('wikibok-represent-node','error','depth'),
							5000
						);
					}
				}
				else {
					//5秒経過すると自動で閉じる
					$.wikibok.timePopup(
						$.wikibok.wfMsg('wikibok-represent-node','title'),
						$.wikibok.wfMsg('wikibok-represent-node','error','already'),
						5000
					);
				}
				break;
			case 'normal':
			default:
				pid = '';
				tmp = '<dl class="content"><dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','view')+'</dt>'
						+ '<dd class="command description-view">'+$.wikibok.wfMsg('wikibok-contextmenu','description','view')+'</dd>';
				if(wgLogin && wgEdit && wgAction != 'load') {
				tmp = tmp
						+ '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','edit')+'</dt>'
						+ '<dd class="command bokeditor-edge-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','edge-delete')+'</dd>'
						+ '<dd class="command bokeditor-node-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','node-delete')+'</dd>'
						+ '<dd class="command bokeditor-find-parent">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','find-parent')+'</dd>'
						+ '<dd class="command bokeditor-find-childs">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','find-childs')+'</dd>'
						+ '<dd class="command bokeditor-only-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','only-delete')+'</dd>'
						+ '<dd class="command bokeditor-node-create">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','node-create')+'</dd>'
						+ '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','special')+'</dt>'
						+ '<dd class="command bokeditor-rename">'+$.wikibok.wfMsg('wikibok-contextmenu','description','rename')+'</dd>'
						+ '<dd class="command bokeditor-represent">'+$.wikibok.wfMsg('wikibok-contextmenu','description','represent')+'</dd>';
				}
				tmp = tmp+'</dl>';
				open = true;
				break;
		}
		if(open) {
			context_dialog(tmp);
		}
	}
	function represent(a) {
		var
			tmp = '<dl class="rename_new_node">'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-represent-node','headline1')+'</dt>'
					+ '<dd><span class="txt">'+a+'</span></dd>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-represent-node','headline2')+'</dt>'
					+ '<dd class="data"></dd>'
					+ '</dl>',
			dx = $.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-represent-node','title'),
				'',
				{
					create : function() {
						$(this).html(tmp);
					},
					close : function() {
						mode = 'normal';
					},
					buttons : [{
						text : $.wikibok.wfMsg('wikibok-represent-node','button','text'),
						class: $.wikibok.wfMsg('wikibok-represent-node','button','class'),
						title: $.wikibok.wfMsg('wikibok-represent-node','button','title'),
						click: function(){
							function pname(p) {
								return $.wikibok.getPageNamespace(p)+':'+$.wikibok.getPageName(p);
							}
							var
								_rows = $.map(rid,function(d,i) {
									return {
										delete : d.smwlinkto,
										source : pname(d.description),
										target : pname(d.smwlinkto),
									};
								});
							$.wikibok.requestCGI(
								'WikiBokJs::representNodeRequest',
								[_rows],
								function(dat,stat,xhr) {
								},
								function(xhr,stat,err) {
								}
							)
							.done(function(dat,stat,xhr) {
							})
							.fail(function() {
							});
							
						}
					},{
						text : $.wikibok.wfMsg('common','button_close','text'),
						class: $.wikibok.wfMsg('common','button_close','class'),
						title: $.wikibok.wfMsg('common','button_close','title'),
						click: function(){
							$(this).dialog('close');
						}
					}]
				},
				a
			),
			itm = $.map(rid,function(d,i) {
				var
					e = d.smwlinkto,
					_id = 'represent_chk_'+a+'_'+i;
				return '<span class="del wikibok_icon" title="中止"/><span data="'+e+'" class="txt">'+e+'</span>';
			}),
			itm = (itm.length < 1) ? $.wikibok.wfMsg('wikibok-represent-node','caution') : itm.join('<br/>');
		$(dx).find('dd.data').html(itm);
		//追加キャンセルイベントの設定
		$(dx).find('span.del').one('click',function(e,f) {
			delete rid[$(e.target).next().attr('data')];
			represent(a);
		});
	}
	/**
	 * ノード名称変更
	 */
	function renameNode(a) {
		var
			_open = true,
			tmp = '<dl>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-rename-node','headline1')+'</dt><dd>'+a+'</dd>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-rename-node','headline2')+'</dt>'
					+ '<dd class="rename_new_node"><input type="text" class="name"/></dd>'
					+ '</dl>';
		$.wikibok.exDialog(
			$.wikibok.wfMsg('wikibok-rename-node','title'),
			'',
			{
				create : function() {
				},
				open : function() {
					$(this).dialog('widget').setInterruptKeydown([{
						class : 'name',
						next : $.wikibok.wfMsg('wikibok-rename-node','button','class'),
						prev : $.wikibok.wfMsg('common','button_close','class')
					}]);
				},
				focus : function() {
					if(_open) {
						$(this).html(tmp);
						_open = false;
					}
				},
				buttons : [{
					text : $.wikibok.wfMsg('wikibok-rename-node','button','text'),
					class: $.wikibok.wfMsg('wikibok-rename-node','button','class'),
					title: $.wikibok.wfMsg('wikibok-rename-node','button','title'),
					click: function(){
						var
							newName = $(this).find('input.name').val(),
							error = false;
						if(newName == '') {
							error = $.wikibok.wfMsg('wikibok-rename-node','error','empty');
						}
						if(svg.allNode().filter(function(d) {return d.name == newName}).length > 0) {
							error = $.wikibok.wfMsg('wikibok-rename-node','error','already');
						}
						if(error !== false) {
							$.wikibok.exDialog(
								$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
								error,
								{}
							);
						}
						else {
							alert('サーバリクエスト');
							if(false) {
							}
							else {
								svg.renameNode(a,newName);
								$(this).dialog('close');
							}
						}
					}
				},{
					text : $.wikibok.wfMsg('common','button_close','text'),
					class: $.wikibok.wfMsg('common','button_close','class'),
					title: $.wikibok.wfMsg('common','button_close','title'),
					click: function(){
						$(this).dialog('close');
					}
				}]
			}
		);
	}
	function createNodeRequest(a,b) {
		var
			//サーバへのリクエスト設定が異なる
			cgi_func = (arguments.length < 2 || b == '') ? 'WikiBokJs::createNodeRequest' : 'WikiBokJs::createNodeToRequest',
			cgi_args = (arguments.length < 2 || b == '') ? [a] : [a,b];
		$.wikibok.requestCGI(
			cgi_func,
			cgi_args,
			function(cDat,stat,xhr) {
				if(cDat.res == false) {
					error = cDat.b;
					return false;
				}
				else {
					return true;
				}
			},
			function(xhr,stat,err) {
			}
		)
		.done(function(cDat) {
			svg.addNode(a,b);
			$.revision.setRev(cDat.res);
			svg.actNode(a);
		});
	}
	/**
	 * 新規ノード作成
	 */
	function createNewNode(a) {
		var
			inp = '<dt>'+$.wikibok.wfMsg('wikibok-new-element','bok','headline2')+'</dt>'
					+ '<dd class="create_new_node"><input type="text" class="name"/></dd>',
			tmp = '<dl>'
					+ ((arguments.length < 1)
					? inp
					: '<dt>'+$.wikibok.wfMsg('wikibok-new-element','bok','headline1')+'</dt><dd>'+a+'</dd>' + inp)
					+ '<dt><hr/></dt>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-new-element','bok','headline3')+'</dt>'
					+ '<dd class="create_new_node description">loading...</dd>'
					+ '</dl>',
			addTo =(arguments.length < 1) ? '' : a,
			open = true;
		$.wikibok.exDialog(
			$.wikibok.wfMsg('wikibok-new-element','title'),
			tmp,
			{
				height : '+300',
				focus : function() {
					if(open) {
						//表示更新
						$(this).html(tmp);
						//イベント定義
						$(this).dialog('widget').setInterruptKeydown([{
							class : 'name',
							next : $.wikibok.wfMsg('wikibok-new-element','bok','button','class'),
							prev : $.wikibok.wfMsg('common','button_close','class')
						}]);
						$(this).find('input.name').setCompleteDescription({
							position : {
								my : 'left bottom',
								at : 'right bottom',
							},
						},{},{
							view : $(this).find('dd.description')
						});
					}
					open = false;
				},
				buttons : [{
					//ノード作成ボタン
					text : $.wikibok.wfMsg('wikibok-new-element','bok','button','text'),
					class: $.wikibok.wfMsg('wikibok-new-element','bok','button','class'),
					title: $.wikibok.wfMsg('wikibok-new-element','bok','button','title'),
					click: function(){
						var
							dialog = this,
							newName = $(dialog).find('input.name').val(),
							_status = true;
						//クライアント上で分かるエラー
						if(newName == '') {
							_status = $.wikibok.wfMsg('wikibok-new-element','error','empty');
						}
						if(svg.allNode().filter(function(d) {return d.name == newName}).length > 0) {
							_status = $.wikibok.wfMsg('wikibok-new-element','error','already');
						}
						if(_status === true) {
							$.wikibok.getDescriptionPage(newName,['links'])
							.done(function(dat) {
								var
									page = dat.parse,
									ptxt = $(page.text['*']),
									desc = (ptxt.html() == null) ? $('<div>'+$.wikibok.wfMsg('wikibok-description','empty')+'</div>') : ptxt;
									//リンクを別タブ(ウィンドウ)で開く
									desc.find('a').attr({target:'_blank'});
								$.wikibok.viewDescriptionDialog(newName,desc,'create');
							})
							.fail(function() {
								//記事がないので直接編集画面を開く
								$.wikibok.getDescriptionEdit(newName)
								.done(function(dat) {
									var
										page = dat.query.pages,
										token = $.map(page,function(d) {return d.edittoken;}).join(),
										timestamp = $.map(page,function(d) {return d.starttimestamp;}).join();
									//編集結果をAPIで反映してから,BOK-XMLへ反映する/しない
									$.wikibok.editDescriptionDialog(newName,'',{
										title : $.wikibok.getPageNamespace(newName)+':'+$.wikibok.getPageName(newName),
										token : token,
										basetimestamp : timestamp,
										createonly : true,
									});
									//SVGへの要素追加処理が抜けてる...
								});
						});
							$(dialog).dialog('close');
						}
						else {
							$.wikibok.exDialog(
								$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
								_status,
								{}
							);
						}
					}
				},{
					text : $.wikibok.wfMsg('common','button_close','text'),
					class: $.wikibok.wfMsg('common','button_close','class'),
					title: $.wikibok.wfMsg('common','button_close','title'),
					click: function(){
						$(this).dialog('close');
					}
				}]
			}
		);
	}
	//検索
	$('#wikibok-search')
		//位置固定/アイコン化
		.setPosition({position : 'lb'},true)
		//検索用イベント定義
		.setSearch(svg,{
			find : '.commit',
			next : '.down',
			prev : '.up',
			list : '.list',
			text : '.text'
		});
	//編集ツールコマンド
	$('#wikibok-edit')
		.on('click','.checked',function(ev) {
			if('ontouched' in document) {
				//キャンセル確認ダイアログ表示
			}
			else {
				//checkCancel();
			}
		})
		.on('click','.new',function(ev) {
			//編集権限なし Or [表示形式:データ読み出し]の場合
			if(!wgEdit || wgAction == 'load') {
				return true;
			}
			createNewNode();
		})
		.on('click','.commit',function(ev) {
		})
		.on('click','.save_as',function(ev) {
		})
		.on('click','.undo',function(ev) {
		})
		.on('click','.redo',function(ev) {
		});

	//アクション選択
	switch(wgAction) {
		case 'load':
			//保存済みデータの表示
			break;
		default:
			//その他(通常表示)
			$.when(
				$.wikibok.loadDescriptionPages(),
				$.wikibok.requestCGI(
					'WikiBokJs::getBokJson',
					[],
					function(dat,stat,xhr) {
						svg.load(dat.xml);
						return true;
					},
					function(xhr,stat,err) {
						return false;
					}
				)
			)
			.done(
				function(d) {
					//定期更新の予約(記事情報取得)
					$.timer.add(svg.update,true);
					$.timer.add($.wikibok.loadDescriptionPages);
					//ハッシュタグまたはデフォルト値を強調
					var h = $.wikibok.getUrlVars('#') || $.wikibok.wfMsg('defaultFocus');
					if(h != undefined && h != '') {
						var aNode = $('*[data="'+h+'"]');
						if(aNode.length < 1) {
							$(window).scrollTo('50%');
						}
						else {
							svg.actNode(h);
							$.scrollTo(aNode);
						}
					}
				}
			);
			break;
	}
});
