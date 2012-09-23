jQuery(function($) {
	var
		dElem = $('body').get(0),
		bok,
		tid,
		pid,
		rid,
		mode = 'normal',
		mode_mes,
		svg = $('#result').bok({
			success : function(r) {
			},
			polygonClick : function() {
				$.revision.editTree(true);
			},
			textClick : textClick,
			pathClick : function(d) {
				alert(d.source.name);
			},
			node : {
				class : 'empty',
				func : function(d){
					return (($.wikibok.findDescriptionPage(d.name,false,true)).length < 1);
				}
			}
		});
	function moveNode(a,b) {
		$.wikibok.requestCGI(
			'WikiBokJs::moveNodeRequest',
			[a,b],
			function(dat,stat,xhr) {
				return true;
			},
			function(xhr,stat,err) {
				return false;
			}
		)
		.done(function(dat) {
			if(dat.res == false) {
				//失敗
			}
			else {
				svg.moveNode();
			}
		})
			
			
	}
	function textClick(d) {
		var
			tmp,
			open = false,
			tid = d.name;
		switch(mode) {
			//後から選択した方が親
			case 'parent':
				alert("親:"+tid+"\n子:"+pid);
				mode = 'normal';
				break;
			//後から選択した方が子
			case 'childs':
				alert("親:"+pid+"\n子:"+tid);
				mode = 'normal';
				break;
			//BOK上に表示しないノードを複数選択
			case 'represent':
				var disp;
				//除外
				if(rid.tid == undefined && tid != pid) {
					rid[tid] = {
						description : pid,
						smwlinkto : tid
					}
				}
				else {
					//追加済み
					
				}
				represent(pid);
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
				open = true;
				break;
		}
		tmp = tmp+'</dl>';
		if(open) {
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-contextmenu','title'),
				'',
				{
					open : function() {
						var
							dialog = this;
						$(dialog).html(tmp);
						$(dialog)
							.on('click','.description-view',function(a,b){
								viewDescriptionDialog(tid);
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
								alert('紐削除:'+tid);
							})
							.on('click','.bokeditor-node-create',function(a,b) {
								createNewNode(tid);
							})
							.on('click','.bokeditor-rename',function(a,b) {
								renameNode(tid);
							})
							.on('click','.bokeditor-represent',function(a,b) {
								pid = tid;
								rid = {};
								mode = 'represent';
							})
							.on('click','.command',function(a,b) {
								$(dialog).off('click');
								$(dialog).dialog('close');
							});
					}
				}
			);
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
							var dat = $(this).find('span.txt').map(function(i,e){
									return a+"\0"+$(e).attr('data');
								});
							$.wikibok.requestCGI(
								'WikiBokJs::representNodeRequest',
								[a,dat],
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
			});
		$(dx).find('dd.data').html(itm.join("<br/>\n"));
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
			_id = $.wikibok.uniqueID('dialog',$.wikibok.wfMsg('wikibok-rename-node','title')),
			tmp = '<dl>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-rename-node','headline1')+'</dt><dd>'+a+'</dd>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-rename-node','headline2')+'</dt>'
					+ '<dd class="rename_new_node"><input type="text" class="name"/></dd>'
					+ '</dl>';
		if($('#'+_id).dialog('isOpen')) {
			$('#'+_id).dialog('close');
		}
		$.wikibok.exDialog(
			$.wikibok.wfMsg('wikibok-rename-node','title'),
			'',
			{
				create : function() {
				},
				open : function() {
					$(this).html(tmp);
					$(this).dialog('widget').setInterruptKeydown([{
						class : 'name',
						next : $.wikibok.wfMsg('wikibok-rename-node','button','class'),
						prev : $.wikibok.wfMsg('common','button_close','class')
					}]);
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
	/**
	 * 新規ノード作成
	 */
	function createNewNode(a) {
		var
			_id = $.wikibok.uniqueID('dialog',$.wikibok.wfMsg('wikibok-new-element','title')),
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
			//サーバへのリクエスト設定が異なる
			cgi_func = (arguments.length < 1) ? 'WikiBokJs::createNodeRequest' : 'WikiBokJs::createNodeToRequest',
			cgi_args = [];
		if($('#'+_id).dialog('isOpen')) {
			$('#'+_id).dialog('close');
		}
		$.wikibok.exDialog(
			$.wikibok.wfMsg('wikibok-new-element','title'),
			'',
			{
				width : $.wikibok.wfMsg('wikibok-new-element','width'),
				height : $.wikibok.wfMsg('wikibok-new-element','height'),
				create : function() {
				},
				open : function() {
					$(this).html(tmp);
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
				},
				buttons : [{
					text : $.wikibok.wfMsg('wikibok-new-element','bok','button','text'),
					class: $.wikibok.wfMsg('wikibok-new-element','bok','button','class'),
					title: $.wikibok.wfMsg('wikibok-new-element','bok','button','title'),
					click: function(){
						var
							dialog = this,
							newName = $(dialog).find('input.name').val(),
							error = false;
						if(newName == '') {
							error = $.wikibok.wfMsg('wikibok-new-element','error','empty');
						}
						if(svg.allNode().filter(function(d) {return d.name == newName}).length > 0) {
							error = $.wikibok.wfMsg('wikibok-new-element','error','already');
						}
						$.wikibok.getDescriptionPage(newName,['links','revid'])
						.done(function(dat){
							//記事内容表示
							var
								page = dat.parse,
								ptxt = $(page.text['*']),
								//作成されていない Or 記事内容が空
								desc = (page.revid == 0 || ptxt.html() == null)
										 ? $('<div>'+$.wikibok.wfMsg('wikibok-description','empty')+'</div>') 
										 : ptxt;
							//リンクを別タブ(ウィンドウ)で開く
							desc.find('a').attr({target:'_blank'});
							$.wikibok.exDialog(
								$.wikibok.wfMsg('wikibok-edittool','view','title'),
								$('#wikibok-description-view'),
								{
									open : function() {
										$(this).find('dd.title').html(page.displaytitle);
										$(this).find('dd.wikibok-text').html(desc);
									},
									buttons:[{
										text : $.wikibok.wfMsg('common','button_ok','text'),
										title: $.wikibok.wfMsg('common','button_ok','title'),
										class: $.wikibok.wfMsg('common','button_ok','class'),
										click: function() {
											var me = this;
											$(me).dialog('close');
										}
									},{
										text : $.wikibok.wfMsg('common','button_cancel','text'),
										title: $.wikibok.wfMsg('common','button_cancel','title'),
										class: $.wikibok.wfMsg('common','button_cancel','class'),
										click: function() {
											var me = this;
											$(me).dialog('close');
										}
									}]
								},
								newName
							);
						})
						.fail(function(dat) {
							//記事新規作成...
							editDescriptionDialog(newName,'');
						});
/*
						if(error === false) {
							//クライアント-チェック終了 => サーバへリクエスト
							cgi_args = (addTo == '') ? [newName] : [newName,addTo];
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
								svg.addNode(newName,addTo);
								$.revision.setRev(cDat.res);
							})
							.always(function() {
								if(error !== false) {
									$.wikibok.exDialog(
										$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
										error,
										{}
									);
								}
								else {
									$(dialog).dialog('close');
								}
							});
						}
*/
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
