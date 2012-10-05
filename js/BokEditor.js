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
							chkCancel($.wikibok.wfMsg('wikibok-edittool','search','parent'))
							mode = 'parent';
						})
						.on('click','.bokeditor-find-childs' ,function(a,b) {
							pid = tid;
							chkCancel($.wikibok.wfMsg('wikibok-edittool','search','child'))
							mode = 'childs';
						})
						.on('click','.bokeditor-only-delete',function(a,b) {
							delNodeRequest(tid,false);
						})
						.on('click','.bokeditor-node-delete',function(a,b) {
							delNodeRequest(tid,true);
						})
						.on('click','.bokeditor-edge-delete',function(a,b) {
							delEdgeRequest(tid);
						})
						.on('click','.bokeditor-node-create',function(a,b) {
							createNewNode(tid);
						})
						.on('click','.bokeditor-rename',function(a,b) {
							renameNode(tid);
						})
						.on('click','.bokeditor-represent',function(a,b) {
							pid = {name : tid,depth : depth};
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
	/**
	 * ノード削除処理リクエスト
	 * @param a 削除対象ノード名称
	 * @param b 配下のノードを一緒に削除する[True]/しない[False/省略]
	 */
	function delNodeRequest(a,b) {
		var
			error,
			arg_args = [a],
			arg_func = (arguments.length < 2 || b == undefined || b == false) 
				? 'WikiBokJs::deleteNodeOnlyRequest':'WikiBokJs::deleteNodeRequest';
		$.wikibok.requestCGI(
			arg_func,
			arg_args,
			function(dat,stat,xhr) {
				if(dat.res === false) {
					error = dat.b;
				}
				return (dat.res !== false);
			},
			function(xhr,stat,err) {
				error = '';
				return false;
			}
		)
		.done(function(dat) {
			svg.delNode(a,b);
			$.revision.setRev(dat.res);
		})
		.fail(function(dat) {
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-delete-node','title')+' '+$.wikibok.wfMsg('common','error'),
				'',
				{
					focus : function(){
						$(this).html(error);
					}
				}
			);
		})
	}
	/**
	 * エッジ削除処理リクエスト
	 * @param a 子ノード名称(エッジ先ノード名)
	 */
	function delEdgeRequest(a) {
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
			//表示SVGデータ更新
			svg.moveNode(a,'');
			//リビジョン番号更新
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
	/**
	 * ノード移動処理リクエスト
	 * @param a 移動対象ノード名称
	 * @param b 移動先ノード名称
	 */
	function moveNodeRequest(a,b) {
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
	/**
	 * ノード作成リクエスト
	 * @param a 作成対象ノード名称
	 * @param b 作成ノードの親ノード名称
	 */
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
	 * ノード名称部分のクリックイベント
	 *  - コンテキストメニュー呼出し
	 */
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
				moveNodeRequest(pid,tid);
				chkCancel();
				break;
			//後から選択した方が子
			case 'childs':
				moveNodeRequest(tid,pid);
				chkCancel();
				break;
			//BOK上に表示しないノードを複数選択
			case 'represent':
				//除外
				if(tid == pid.name) {
					$.wikibok.timePopup(
						$.wikibok.wfMsg('wikibok-represent-node','title')+' '+$.wikibok.wfMsg('common','error'),
						$.wikibok.wfMsg('wikibok-represent-node','error','equal'),
						5000
					);
				}
				else if(rid[tid] == undefined) {
					if(depth == pid.depth) {
						rid[tid] = {description : pid.name,smwlinkto : tid};
						represent(pid.name);
					}
					else {
						$.wikibok.timePopup(
							$.wikibok.wfMsg('wikibok-represent-node','title')+' '+$.wikibok.wfMsg('common','error'),
							$.wikibok.wfMsg('wikibok-represent-node','error','depth'),
							5000
						);
					}
				}
				else {
					$.wikibok.timePopup(
						$.wikibok.wfMsg('wikibok-represent-node','title')+' '+$.wikibok.wfMsg('common','error'),
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
	/**
	 * ノードの代表表現選択
	 * @param a 代表ノード設定
	 */
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
					open : function() {
						rid = {};
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
								me = this,
								_rows = $.map(rid,function(d,i) {
									return {
										child : d.smwlinkto,
										parent : d.description,
										source : pname(d.description),
										target : pname(d.smwlinkto),
									};
								});
							if(_rows.length < 1) {
								$.wikibok.timePopup(
									$.wikibok.wfMsg('wikibok-represent-node','title')+' '+$.wikibok.wfMsg('common','error'),
									$.wikibok.wfMsg('wikibok-represent-node','error','noselect'),
									5000
								);
							}
							else {
								//BOK-XMLと代表表現リンクの作業データを登録
								$.wikibok.requestCGI(
									'WikiBokJs::representNodeRequest',
									[_rows],
									function(dat,stat,xhr) {return (dat.res !== false);},
									function(xhr,stat,err) {return false;}
								)
								.done(function(dat,stat,xhr) {
									//画面表示データを更新
									for(var i=0;i<_rows.length;i++) {
										svg.moveNode(_rows[i].child,_rows[i].parent);
										//設定により、従属ノードの配下ノードを削除するしないが異なる
										svg.delNode(_rows[i].child,wgRepsDel);
									}
									$.revision.setRev(dat.res);
									$(me).dialog('close');
								});
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
								$.wikibok.viewDescriptionDialog(newName,desc,'create')
								.done(function(res){
									if(res == true) {
										//TRUEのときのみBOK-XMLへ追加
										createNodeRequest(newName,addTo)
									}
								});
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
									})
									.done(function(res) {
										if(res) {
											//TRUEのときのみBOK-XMLへ追加
											createNodeRequest(newName,addTo)
										}
									});
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
		//編集キャンセル
		.on('click','.checked',function(ev) {
		var
			chkItem = $('#wikibok-edit').find('span.checked'),
			chkParent = chkItem.parent(),
			message = chkParent.attr('title'),
			open = true;
			if('ontouched' in document) {
				//iPadなどでは確認ダイアログ表示
				$.wikibok.exDialog(
					$.wikibok.wfMsg('common','check'),
					'',
					{
						focus : function() {
							if(open) {
								$(this).html(message.replace(/(\r|\n)/g,'\n').replace(/\n/g,'<br/>'));
							}
							open = false;
						},
						buttons : [{
							text : $.wikibok.wfMsg('common','button_yes','text'),
							title: $.wikibok.wfMsg('common','button_yes','title'),
							class: $.wikibok.wfMsg('common','button_yes','class'),
							click: function() {
								chkCancel();
								$(this).dialog('close');
							}
						},{
							text : $.wikibok.wfMsg('common','button_no','text'),
							title: $.wikibok.wfMsg('common','button_no','title'),
							class: $.wikibok.wfMsg('common','button_no','class'),
							click: function() {
								$(this).dialog('close');
							}
						}]
					}
				);
			}
			else {
				chkCancel();
			}
		})
		//新規ノード追加
		.on('click','.new',function(ev) {
			//編集権限なし Or [表示形式:データ読み出し]の場合
			if(!wgEdit || wgAction == 'load') {
				return true;
			}
			createNewNode();
		})
		//サーバへ更新反映
		.on('click','.commit',function(ev) {
			function rev_request() {
				var
					rev_def = $.Deferred();
				$.wikibok.requestCGI(
					'WikiBokJs::getBokRevision',
					[wgUserName],
					function(dat,stat,xhr) {
						rev_def.resolve(dat);
					},
					function(xhr,stat,err) {
						rev_def.reject();
					},
					false
				)
				return rev_def.promise();
			}
			function doMerge(act) {
				var
					res,
					user=wgUserName,
					merge_def = $.Deferred();
				//リクエスト回数をカウント
				request_count++;
				$.wikibok.requestCGI(
					'WikiBokJs::treeway_merge',
					[act,user],
					function(dat,stat,xhr) {
						var
							_code = (dat.res).toUpperCase(),
							_rev  = parseInt(dat.newRev),
							_eSet = dat.eSet;
						switch(_code) {
							case 'NO PERMISION':
								res = $.wikibok.wfMsg('wikibok-merge','error','nologin')
										+ $.wikibok.wfMsg('wikibok-merge','error','needlogin');
								merge_def.reject(res);
								break;
							case 'INSERT':
								$.wikibok.requestCGI(
									'WikiBokJs::insertMergeXml',
									[_rev,user,'',_eSet],
									function(_dat,_stat,_xhr) {
										return(_dat.res == 'merge complate');
									},
									function(xhr,stat,err) {
										return false;
									},
									false
								)
								.done(function(_dat,_stat,_xhr) {
									merge_def.resolve(_dat);
								});
								break;
							default:
								res = $.wikibok.wfMsg('wikibok-merge','error','nochange')
										+ $.wikibok.wfMsg('wikibok-merge','error','refreshdata');
								merge_def.reject(res);
								break;
						}
					},
					function(xhr,stat,err) {
						merge_def.reject('Others');
					},
					false
				)
				return merge_def.promise();
			}
			function editSetBox(dat,title) {
				
			}
			var
				base_rev,
				head_rev,
				//サーバへのリクエスト回数をリセット
				request_count = 0;
				//更新作業中はタイマー機能を停止
				$.timer.stop();
				//クライアントの情報取得
				base_rev = $.revision.getData();
				//モーダルダイアログで他処理をできないように制御
				$.wikibok.exDialog(
					$.wikibok.wfMsg('wikibok-merge','title'),
					$.wikibok.wfMsg('wikibok-merge','loading'),
					{
						modal : true,
						draggable : false,
						resizable : false,
						closeOnEscape : false,
						buttons : [],
						beforeClose : function() {
							$.revision.request();
						},
						open : function() {
							var
								me = this,
								edit_count,
								eSet,
								addSet,
								delSet,
								tag;
							rev_request()
							.done(function(dat) {
								head_rev = dat;
								//編集データあり
								if(head_rev.edit) {
									if(parseInt(base_rev.user) > parseInt(base_rev.base)) {
										doMerge(base_rev.user)
										.done(function(res) {
											//マージ結果分割
											eSet = res.eSet;
											addSet = (eSet.add == undefined) ? [] : $.map(eSet.add,function(d,k) {return k;});
											delSet = (eSet.del == undefined) ? [] : $.map(eSet.del,function(d,k) {return k;});
											tag = (function(a1,a2){
												var
													a = {},
													b = {},
													d = {};
												for(var i=0;i<a1.length;i++) {
													a[a1[i]] = true;
												}
												for(var i=0;i<a2.length;i++) {
													if(a[a2[i]]) {
														d[a2[i]] = true;
														delete a[a2[i]];
													}
													else {
														b[a2[i]] = true;
													}
												}
												return {
													add : $.map(a,function(d,k){return k;}),
													del : $.map(b,function(d,k){return k;}),
													move: $.map(d,function(d,k){return k;})
												};
											})(addSet,delSet);
											//結果表示ダイアログボックス
											editSetBox(tag.add,$.wikibok.wfMsg('wikibok-merge','conflict','add'));
											editSetBox(tag.del,$.wikibok.wfMsg('wikibok-merge','conflict','del'));
											editSetBox(tag.move,$.wikibok.wfMsg('wikibok-merge','conflict','move'));
											//追加ノードありの場合
											if(tag.add.length > 0) {
												//BOKデータの追加
												for(var i=0;i<tag.add.length;i++) {
													//記事作成
													$.wikibok.overwritePage(
														//BOK用名前空間を補足
														wgExtraNamespace[wgNsBok]+':'+tag.add[i],
														$.wikibok.wfMsg('wikibok-empty-article')
													);
												}
											}
											//削除ノードありの場合
											if(tag.del.length > 0) {
												//representノードの確認
												$.wikibok.requestCGI(
													'WikiBokJs::representLinkData',
													[],
													function(dat,stat,xhr) {return dat.res;},
													function(xhr,stat,err) {}
												)
												.done(function(a,b,c) {
													var
														recs = a.data,
														sources = $.unique($.map(recs,function(d){
															return d.source;
														})),
														source,
														links = {};
													for(var i=0;i<sources.length;i++) {
														source = $.wikibok.getPageName(sources[i]);
														links[source] = $.map(recs,function(d){
															if((d.source == sources[i]) && ($.inArray($.wikibok.getPageName(d.target),tag.del) >= 0)) {
																return d.link;
															}
														}).join();
													}
													$.each(links,function(add_desc,node_name) {
														//記事作成(追記ON)
														$.wikibok.overwritePage(
															//BOK用名前空間を補足
															node_name,
															add_desc,
															true
														);
													});
												});
											}
											$(me).dialog('close');
											
											
											
											
											
											$.timer.start();
										})
										.fail(function() {
											$(me).dialog('close');
											if(request_count < 5) {
												$(me).dialog('open');
											}
											else {
												$.wikibok.timePopup(
													$.wikibok.wfMsg('common','caution'),
													$.wikibok.wfMsg('wikibok-merge','error','busy')+$.wikibok.wfMsg('wikibok-merge','error','retry'),
													5000
												);
												$.timer.start();
											}
										});
									}
									else {
										$(me).dialog('close');
										if(base_rev.head == head_rev.head) {
											$.wikibok.timePopup(
												$.wikibok.wfMsg('common','check'),
												$.wikibok.wfMsg('wikibok-merge','error','noedit'),
												5000
											);
										}
										else {
											$.wikibok.timePopup(
												$.wikibok.wfMsg('common','check'),
												$.wikibok.wfMsg('wikibok-merge','error','findnewrev'),
												5000
											);
										}
									}
								}
								else {
									if(head_rev.base == base_rev.base) {
										//ベースリビジョンに更新なし
										$.wikibok.timePopup(
											$.wikibok.wfMsg('common','check'),
											$.wikibok.wfMsg('wikibok-merge','error','newest'),
											5000
										);
										$(me).dialog('close');
									}
									else {
										//ベースリビジョンに更新あり
										// => 編集データをクリアしてメッセージ表示
										$.wikibok.requestCGI(
											'WikiBokJs::clearEditHistory',
											[],
											function(dat,stat,xhr) {return true;},
											function(dat,stat,xhr) {return true;}
										)
										.done(function() {
											$.wikibok.timePopup(
												$.wikibok.wfMsg('common','check'),
												$.wikibok.wfMsg('wikibok-merge','error','findnewrev'),
												5000
											);
											$(me).dialog('close');
										});
									}
								}
							});
						},
					}
				);
		})
		//XMLデータ保存
		.on('click','.save_as',function(ev) {
			
		})
		//編集操作を戻す
		.on('click','.undo',function(ev) {
			var
				act = $.revision.getRev() - 1;
			loadBokXml(act);
		})
		//編集操作を進む
		.on('click','.redo',function(ev) {
			var
				act = $.revision.getRev() + 1;
			loadBokXml(act);
		});
	/**
	 * データ読み込み処理
	 * @param a リビジョン番号
	 */
	function loadBokXml(a) {
		var
			revData = $.revision.getData(),
			_base = parseInt(revData.base),
			_head = parseInt(revData.head),
			_user = parseInt(revData.user),
			act = ((arguments.length < 1 || a == undefined) ? _user : ((parseInt(a) < _base) ? _base : parseInt(a) || 0));
		return $.wikibok.requestCGI(
			'WikiBokJs::getBokJson',
			[act,wgUserName],
			function(dat,stat,xhr) {
				svg.load(dat.xml);
				$.revision.setRev(dat.act);
				return true;
			},
			function(xhr,stat,err) {
				return false;
			},
			false
		);
	}

	/**
	 * 選択モードキャンセル処理
	 */
	function chkCancel(a) {
		var
			chkItem = $('#wikibok-edit').find('span.checked'),
			chkParent = chkItem.parent();
		if(arguments.length < 1 || a == undefined) {
			mode = 'normal';
			chkItem.hide();
		}
		else {
			chkParent.attr('title','['+pid+']'+a+'\n'+chkItem.text());
			chkItem.show();
		}
	}
	chkCancel();
	//アクション選択
	switch(wgAction) {
		case 'load':
			//保存済みデータの表示
			break;
		default:
			//その他(通常表示)
			$.when(
				$.wikibok.loadDescriptionPages(),
				loadBokXml()
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
