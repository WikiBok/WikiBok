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
			w : 600,
			h : 30,
			success : function(r) {
			},
			polygonClick : function() {
			},
			textClick : textClick,
			pathClick : function(d) {
				var
					tmp = '<dl class="content">'
						  + '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','edit')+'</dt>'
						  + '<dd class="command bokeditor-edge-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','edge-delete')+'</dd>'
						  + '</dl>';
				tid = d.target.name;
				if(wgLogin && wgEdit) {
					context_dialog(tmp);
				}
			},
			reps : function(d) {return $.wikibok.checkReps(d.name);},
			node : {
				class : 'empty',
				func : function(d){
					return (($.wikibok.findDescriptionPage(d.name,false,true)).length < 1);
				}
			}
		});
	function context_dialog(tmp,item) {
		var
			dtitle = $.wikibok.wfMsg('wikibok-contextmenu','title'),
			dparent = $.wikibok.wfMsg('wikibok-edittool','search','parent'),
			dchild = $.wikibok.wfMsg('wikibok-edittool','search','child'),
			_open = true;
		$.wikibok.exDialog(
			dtitle,
			'',
			{
				create : function() {
				},
				focus : function() {
					var dialog = this;
					if(_open) {
						_open = false;
						$(this).html(tmp);
					}
					//各メニューのイベントを設定[前回設定イベントを削除..]
					$(this).off('click');
					$(this)
						.on('click','.command',function(a,b) {
							$(dialog).dialog('close');
						})
						.on('click','.description-view',function(a,b){
							var
								_title = tid;
								_desc = $.wikibok.findDescriptionPage(tid,false),
								_rev = (_desc.length > 0 && _desc[0].rev != undefined) ? _desc[0].rev : false;
							if(editPanel()) {
								$.wikibok.getDescriptionPage(_title)
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
							}
							else {
								$.wikibok.getDescriptionRevision(_title,_rev)
								.done(function(dat) {
									var
										page = dat.parse,
										ptxt = $(page.text['*']),
										desc = (ptxt.html() == null) ? $('<div>'+$.wikibok.wfMsg('wikibok-description','empty')+'</div>') : ptxt;
										//リンクを別タブ(ウィンドウ)で開く
										desc.find('a').attr({target:'_blank'});
									$.wikibok.viewDescriptionDialog(_title,desc,'view',page.revid);
								})
								.fail(function() {
									alert('記事がない...');
								});
							}
						})
						.on('click','.bokeditor-find-parent',function(a,b) {
							pid = tid;
							chkCancel(dparent)
							mode = 'parent';
						})
						.on('click','.bokeditor-find-childs' ,function(a,b) {
							pid = tid;
							chkCancel(dchild)
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
							pid = item;
							mode = 'represent';
							represent(pid.name);
						})
						.on('click','.bokeditor-addtopic',function(a,b) {
							addTopicRequest(tid);
						});
				}
			}
		);
	}
	function actNode() {
		var
			args = Array.prototype.slice.apply(arguments),
			node = (args.length < 1 || args[0] == undefined) ? false : args[0],
			time = (args.length < 2 || args[1] == undefined) ? 1  : args[1],
			opt =  (args.length < 3 || args[2] == undefined) ? {offset:{top:-150,left:-150}} : args[2];
		return $.Deferred(function(def) {
			if($('g[data="'+node+'"]').length > 0) {
				svg.actNode(node)
				.done(function() {
					$.scrollTo($('g[data="'+node+'"]'),time,opt);
					def.resolve();
				});
			}
			else {
				def.resolve();
			}
		}).promise();
	}
	function addTopicRequest() {
		var
			args = Array.prototype.slice.apply(arguments),
			node = (args.length < 1 || args[0] == undefined) ? false : args[0];
		$.wikibok.requestCGI(
			'WikiBokJs::createNodeFromLinks',
			[node],
			function(dat,stat,xhr) {
				var
					err = '';
				if(dat.res !== false) {
					//TOPIC追加ノードをキャンパスに追加
					$.each(dat.add,function(i,n) {
						svg.addNode(n,node);
					});
					$.revision.setRev(dat.res);
					actNode(node);
				}
				else {
					if(dat.err.length < 1) {
						err = $.wikibok.wfMsg('wikibok-add-topic','error',dat.message.toLowerCase());
					}
					else {
						err = '<table class="add_topic"><tr><th>'+$.wikibok.wfMsg('wikibok-add-topic','table_title')+'</th></tr>'
								+	$.map(dat.err,function(d,i){
										return ((i % 2) ? '<tr class="odd">':'<tr class="even">')+'<td class="item">'+$.wikibok.getPageName(d)+'</td></tr>';
								}).join('')
								+ '</table>'+$.wikibok.wfMsg('wikibok-add-topic','error',dat.message.toLowerCase());
					}
					$.wikibok.timePopup(
						$.wikibok.wfMsg('wikibok-add-topic','title')+' '+$.wikibok.wfMsg('common','error'),
						err,
						-1
					);
					$('.add_topic')
						.off('click','.item')
						.on('click','.item',function(){
							var
								item = this;
							actNode($(item).html())
							.done(function() {
								//ダイアログを画面内に移動
								setTimeout(function(){
									$(item).parents('.wikibok-exdialog:first')
										.dialog('option','position','center')
										.dialog('moveToTop');
								},100);
							});
						});
				}
			},
			function(xhr,stat,err) {
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
			dtitle = $.wikibok.wfMsg('wikibok-delete-node','title')+' '+$.wikibok.wfMsg('common','error'),
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
			$.wikibok.timePopup(
				dtitle,
				error,
				5000
			);
		})
	}
	/**
	 * エッジ削除処理リクエスト
	 * @param a 子ノード名称(エッジ先ノード名)
	 */
	function delEdgeRequest(a) {
		var
			dtitle = $.wikibok.wfMsg('wikibok-move-node','title')+' '+$.wikibok.wfMsg('common','error'),
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
			$.wikibok.timePopup(
				dtitle,
				error,
				5000
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
			dtitle = $.wikibok.wfMsg('wikibok-move-node','title')+' '+$.wikibok.wfMsg('common','error'),
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
			$.wikibok.timePopup(
				dtitle,
				error,
				5000
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
			actNode(a);
		});
	}
	function renameNodeRequest(a,b) {
		//BOK-XMLデータの更新
		return $.wikibok.requestCGI(
			'WikiBokJs::renameNodeRequest',
			[a,b],
			function(dat,stat,xhr) {
				return (dat.res !== false);
			},
			function(xhr,stat,err) {
				return false;
			}
		);
	}

	/**
	 * ノード名称部分のクリックイベント
	 *  - コンテキストメニュー呼出し
	 */
	function textClick(d) {
		var
			dtitle = $.wikibok.wfMsg('wikibok-represent-node','title')+' '+$.wikibok.wfMsg('common','error'),
			error = false,
			tmp = '<dl class="content"><dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','view')+'</dt>'
					+ '<dd class="command description-view">'+$.wikibok.wfMsg('wikibok-contextmenu','description','view')+'</dd>'
					+ ((wgLogin && wgEdit) ?
					  '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','edit')+'</dt>'
					+ '<dd class="command bokeditor-edge-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','edge-delete')+'</dd>'
					+ '<dd class="command bokeditor-node-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','node-delete')+'</dd>'
					+ '<dd class="command bokeditor-find-parent">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','find-parent')+'</dd>'
					+ '<dd class="command bokeditor-find-childs">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','find-childs')+'</dd>'
					+ '<dd class="command bokeditor-only-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','only-delete')+'</dd>'
					+ '<dd class="command bokeditor-node-create">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','node-create')+'</dd>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','special')+'</dt>'
					+ '<dd class="command bokeditor-rename">'+$.wikibok.wfMsg('wikibok-contextmenu','description','rename')+'</dd>'
					+ ((wgRepsFlg) ? '<dd class="command bokeditor-represent">'+$.wikibok.wfMsg('wikibok-contextmenu','description','represent')+'</dd>' : '')
					+ '<dd class="command bokeditor-addtopic">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','add-topic')+'</dd>'
					: '')
					+ '</dl>',
			depth = d.depth,
			pName = d.parent.name,
			open = false;
		//対象ノードの名称を設定(ClickEventごとに変更の必要あり)
		tid = d.name;
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
				if(wgRepsFlg) {
					//除外
					if(tid == pid.name) {
						error = $.wikibok.wfMsg('wikibok-represent-node','error','equal');
					}
					else if(rid[tid] == undefined) {
						if(depth == pid.depth) {
							//親が異なる場合、エラーにする[2012/11/08]
							if(pid.parent.name != pName) {
								error = $.wikibok.wfMsg('wikibok-represent-node','error','parent');
							}
							else {
								rid[tid] = {description : pid.name,smwlinkto : tid};
								represent(pid.name);
							}
						}
						else {
							error = $.wikibok.wfMsg('wikibok-represent-node','error','depth');
						}
					}
					else {
						error = $.wikibok.wfMsg('wikibok-represent-node','error','already');
					}
					if(error != false) {
						$.wikibok.timePopup(
							dtitle,
							error,
							5000
						);
					}
				}
				break;
			case 'normal':
			default:
				pid = '';
				open = true;
				break;
		}
		if(open) {
			context_dialog(tmp,d);
		}
	}
	/**
	 * ノードの代表表現選択
	 * @param a 代表ノード設定
	 */
	function represent(a) {
		var
			tmp = '<dl class="represent-node">'
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
									//TOPIC追加ノードをキャンパスに追加
									$.each(dat.add,function(i,n) {
										svg.addNode(n,a);
									});
									$.revision.setRev(dat.res);
									actNode(a);
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
				return '<span class="del wikibok_icon button" title="中止"/><span data="'+e+'" class="txt">'+e+'</span>';
			}),
			itm = (itm.length < 1) ? $.wikibok.wfMsg('wikibok-represent-node','caution') : itm.join('<br/>');
		if(wgRepsFlg) {
			$(dx).find('dd.data').html(itm);
			//追加キャンセルイベントの設定
			$(dx).find('span.del').one('click',function(e,f) {
				delete rid[$(e.target).next().attr('data')];
				represent(a);
			});
		}
	}
	/**
	 * ノード名称変更
	 */
	function renameNode(a) {
		var
			_open = true,
			//注意書きをした方が良いかも?
			tmp = '<dl>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-rename-node','headline1')+'</dt><dd>'+a+'</dd>'
					+ '<dt>'+$.wikibok.wfMsg('wikibok-rename-node','headline2')+'</dt>'
					+ '<dd><input type="text" class="name"/></dd>'
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
							_box = this,
							oldName = a,
							newName = $(this).find('input.name').val(),
							error = false;
						if(newName == '') {
							error = $.wikibok.wfMsg('wikibok-rename-node','error','empty');
						}
						else if(oldName == newName) {
							error = $.wikibok.wfMsg('wikibok-rename-node','error','norename');
						}
						else if(svg.allNode().filter(function(d) {return d.name == newName}).length > 0) {
							error = $.wikibok.wfMsg('wikibok-rename-node','error','already');
						}
						if(error !== false) {
							$.wikibok.timePopup(
								$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
								error,
								5000
							);
						}
						else {
							renameNodeRequest(oldName,newName)
							.done(function(dat) {
								$.wikibok.renamePage(oldName,newName);
								$.revision.setRev(dat.act)
								svg.renameNode(oldName,newName);
								$(_box).dialog('close');
							})
							.fail(function(dat) {
								$.wikibok.timePopup(
									$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
									'リネーム失敗',
									5000
								);
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
							newName = ($(dialog).find('input.name').val()).replace(/ /g,'_'),
							_status = true;
						//クライアント上で分かるエラー
						if(newName == '') {
							_status = $.wikibok.wfMsg('wikibok-new-element','error','empty');
						}
						if(svg.allNode().filter(function(d) {return d.name == newName}).length > 0) {
							_status = $.wikibok.wfMsg('wikibok-new-element','error','already');
						}
						if(_status === true) {
							//代表表現の従属ノードかどうか確認
							$.wikibok.requestCGI(
								'WikiBokJs::checkSMWLinkTarget',
								[newName,wgReps],
								function(dat,stat,xhr){return !dat;},
								function(xhr,stat,err){return false;},
								false
							)
							.done(function() {
								//従属ノードでない場合はページの内容確認
								$.wikibok.getDescriptionPage(newName)
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
									var
										_title = $.wikibok.getPageNamespace(newName)+':'+$.wikibok.getPageName(newName);
									//記事がないので直接編集画面を開く
									$.wikibok.getDescriptionEdit(_title)
									.done(function(dat) {
										var
											page = dat.query.pages,
											token = $.map(page,function(d) {return d.edittoken;}).join(),
											timestamp = $.map(page,function(d) {return d.starttimestamp;}).join();
										//編集結果をAPIで反映してから,BOK-XMLへ反映する/しない
										$.wikibok.editDescriptionDialog(_title,'',{
											title : _title,
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
								})
								.always(function() {
									$(dialog).dialog('close');
								});
							})
							.fail(function() {
								$.wikibok.timePopup(
									$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
									'従属ノードは追加できません',
									5000
								);
							});
						}
						else {
							$.wikibok.timePopup(
								$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
								_status,
								5000
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
		.on('click','.help',function(ev) {
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-edittool','help','bok','title'),
				'',
				{
					width : 350,
					create : function() {
						var
							tmpl = '',
							marks = svg.marks_point(4.5),
							marks_count = (function(){var i = 0;for(var n in marks){i ++;}return i})();
						function _tmpl(t,item,pos,type){
							var
								tmp = '<g transform="translate('+pos[0]+','+pos[1]+')"><text>'+t+'</text>',
								add = 10;
							$.each(item,function(k,d) {
								tmp += (arguments < 4 || type == undefined) ? '<g transform="translate(10,'+add+')">':'<g transform="translate(10,'+add+')" class="'+type+'">';
								tmp += '<polygon points="'+d+'"></polygon>';
								tmp += '<text x="8" y="3">'+$.wikibok.wfMsg('wikibok-edittool','help','bok',k)+'</text>';
								tmp += '</g>';
								add += 15;
							});
							return tmp+'</g>';
						}
						tmpl = '<svg width="300" height="'+((marks_count+1)*15 + 100)+'">';
						tmpl+= _tmpl($.wikibok.wfMsg('wikibok-edittool','help','normal'),marks,[10,10]);
						tmpl+= _tmpl($.wikibok.wfMsg('wikibok-edittool','help','empty'),marks,[10,100],'empty');
						tmpl+= '</svg>';
						$(this).html(tmpl);
					}
				}
			);
		})
		//新規ノード追加
		.on('click','.new',function(ev) {
			//編集権限なし Or [表示形式:データ読み出し]の場合
			if(!wgEdit) {
				return true;
			}
			createNewNode();
		})
		//サーバへ更新反映
		.on('click','.commit',function(ev) {
			/**
			 * マージ実行
			 */
			function treeway_merge(act) {
				return $.Deferred(function(def) {
					$.wikibok.requestCGI(
						'WikiBokJs::treeway_merge',
						[act,wgUserName],
						function(dat,stat,xhr){return true;},
						function(xhr,stat,err){return false;},
						false
					)
					.done(function(dat,stat,xhr){
						var
							res = (dat.res).toUpperCase(),
							rev = parseInt(dat.newRev) || 0,
							represent = dat.represent,
							conflicttype,
							message = true;
						if((represent.all).length > 0) {
							//代表表現エラー表示[マージ続行]
							$.wikibok.timePopup(
								$.wikibok.wfMsg('wikibok-merge','represent','title'),
								$.wikibok.wfMsg('wikibok-merge','represent','bodystart')+
								'<table class="linkloop"><tr>'+
								'<th>'+$.wikibok.wfMsg('wikibok-merge','represent','table','mark')+'</th>'+
								'<th>'+$.wikibok.wfMsg('wikibok-merge','represent','table','source')+'</th>'+
								'<th>'+$.wikibok.wfMsg('wikibok-merge','represent','table','target')+'</th>'+
								'</tr>'+$.map(dat.represent.all,function(d,i){
									var mes = (i % 2) ? '<tr class="odd">':'<tr class="even">';
									mes += '<td class="mark">'+((d.res)?$.wikibok.wfMsg('wikibok-merge','represent','ok'):$.wikibok.wfMsg('wikibok-merge','represent','ng'))+'</td>';
									mes += '<td class="item">'+$.wikibok.getPageName(d.source)+'</td><td class="item">'+$.wikibok.getPageName(d.target)+'</td></tr>'
									return mes;
								}).join('') + '</table><br/>'+
								$.wikibok.wfMsg('wikibok-merge','represent','ok')+$.wikibok.wfMsg('wikibok-merge','represent','bodyok')+'<br/>'+
								$.wikibok.wfMsg('wikibok-merge','represent','ng')+$.wikibok.wfMsg('wikibok-merge','represent','bodyng')+'<br/>'+
								$.wikibok.wfMsg('wikibok-merge','represent','bodyend'),
								-1
							);
						}
						switch(res) {
							case 'NO PERMISION':
								message = $.wikibok.wfMsg('wikibok-merge','error','nologin')+$.wikibok.wfMsg('wikibok-merge','error','needlogin');
								break;
							case 'INSERT':
								eSet = dat.eSet;
								conflicttype = (dat.conflict_type).toLowerCase();
								$.wikibok.timePopup(
									$.wikibok.wfMsg('wikibok-merge','conflict','title'),
									$.wikibok.wfMsg('wikibok-merge','conflict',conflicttype),
									5000
								);
								break;
							case 'NO MERGE':
							default:
								message = $.wikibok.wfMsg('wikibok-merge','error','nochange')+$.wikibok.wfMsg('wikibok-merge','error','refreshdata');
								break;
						}
						if(message === true) {
							def.resolve.apply({},[rev,eSet,represent]);
						}
						else {
							def.reject.apply({},[message,represent]);
						}
					});
				}).promise();
			}
			/**
			 * マージ結果登録
			 */
			function insertMergeXml(rev,eSet) {
				return $.Deferred(function(def) {
					$.wikibok.requestCGI(
						'WikiBokJs::insertMergeXml',
						[rev,wgUserName,eSet,$.wikibok.allDescriptionPage(),$.wikibok.getReps()],
						function(dat,stat,xhr){return true;},
						function(xhr,stat,err){return false;},
						false
					)
					.done(function(dat,stat,xhr){
						var
							addSet = (eSet.add == undefined) ? [] : $.map(eSet.add,function(d,k){return k;}),
							delSet = (eSet.del == undefined) ? [] : $.map(eSet.del,function(d,k){return k;}),
							nodes = eSetSeplate(addSet,delSet);
						if(dat.res == 'merge complete') {
							def.resolve.apply({},[addSet,delSet,nodes]);
						}
						else {
							def.reject.apply({},[]);
						}
					})
				}).promise();
			}
			/**
			 * マージ結果ダイアログ
			 */
			function resultDialog(title,data) {
				var
					open = true,
					toggle = false,
					dat = data;
				if(dat.length > 0) {
					$.wikibok.exDialog(
						title,
						$('#wikibok-searchresult'),
						{
							create : function() {
								var
									dialog = $(this),
									_colorPicker = dialog.find('.colorPicker'),
									_colorSelect = dialog.find('.colorSelect'),
									_colorDiv = _colorSelect.find('div');
								//ColorPicker
								_colorPicker.ColorPicker({
									color : _colorDiv.getHexColor(),
									flat : true,
									onSubmit : function(hsb,hex,rgb,elem) {
										_colorDiv.css({backgroundColor : '#'+hex});
										_colorSelect.trigger('click');
									}
								});
								//ColorPickerの表示・非表示切り替え
								_colorSelect.toggle(
									function() {_colorPicker.stop().animate({height:173},500);},
									function() {_colorPicker.stop().animate({height:  0},500);}
								);
							},
							focus : function() {
								var
									dialog = $(this),
									_table = dialog.find('table'),
									_pager = dialog.find('div.pager'),
									_tbody = _table.find('tbody.txt');
								if(open) {
									open = false;
									//データ更新
									_tbody.html(
										$.map(dat,function(d){
											if(d != '') {
												return '<tr class="data" data="'+d+'"><td>'+$.wikibok.escapeHTML(d)+'</td></tr>'
											}
										}).join('')
									);
									//DOM要素に強調時の紐付を設定
									$.each(dat,function(i,d) {
										if(d != '') {
											$('g[data="'+d+'"]').attr(dialog.get(0).id,true);
										}
									});
									//Clickイベント
									_tbody
									.off('click','tr.data')
									.on('click','tr.data',function(e) {
										var
											item = this,
											_data = $(item).attr('data'),
											tName = $(item).html();
										dialog.find('tr').removeClass('act');
										$(item).addClass('act');
										actNode(_data)
										.done(function() {
											//ダイアログを画面内に移動
											setTimeout(function(){
												dialog.dialog('option','position','center').dialog('moveToTop');
											},100);
										});
									});
									//Sorter
									//イベント(その他)の2重登録対策
									_table.find('colgroup').remove();
									_table.find('thead th.header')
										.off('click')
										.off('mousedown')
										.off('selectstart');
									_pager.find('.wikibok_icon')
										.off('click');
									//データ一覧が表示状態でないと色分けが動かないのでここで初期化
									_table.tablesorter({
										widthFixed : true,
										widgets : ['zebra'],
										sortList : [[0,0]],
									})
									.tablesorterPager({
										container : _pager,
										positionFixed : false,
										size : _pager.find('select.pagesize').val()
									});
								}
							},
							close : function() {
								var
									nodes = $('g['+this.id+']');
								//DOMに検索結果一覧との紐付データを削除
								nodes.removeAttr(this.id);
								//強調表示の解除
								nodes.find('polygon,text,circle').css({fill:''});
								svg.clearClassed('active');
							},
							buttons : [{
								//指定の色で検索結果を色づけ
								text : $.wikibok.wfMsg('wikibok-search','button_changecolor','text'),
								title: $.wikibok.wfMsg('wikibok-search','button_changecolor','title'),
								class: $.wikibok.wfMsg('wikibok-search','button_changecolor','class'),
								click: function(a,b) {
									//トグル設定
									$('g['+this.id+']').find('polygon,text,circle').css({
										fill:(toggle) ? '' : $(this).find('.colorSelect').find('div').getHexColor()
									});
									toggle = !toggle;
								}
							},{
								//閉じるボタン
								text : $.wikibok.wfMsg('common','button_close','text'),
								class: $.wikibok.wfMsg('common','button_close','class'),
								title: $.wikibok.wfMsg('common','button_close','title'),
								click:function() {
									$(this).dialog("close");
								}
							}]
						},
						title
					);
				}
			}
			/**
			 * 代表表現をSMW-LINKとして記事に追記
			 */
			function setRepresentData(add) {
				return $.when(
					$.wikibok.requestCGI(
						'WikiBokJs::clearRepresent',
						[],
						function(){return true;},
						function(){return false;}
					),
					$.wikibok.requestCGI(
						'WikiBokJs::getBokJson',
						[0,wgUserName],
						function(rDat,rStat,rXhr) {
							//表示更新
							svg.load(rDat.xml);
							return true;
						},
						function(rXhr,rStat,rErr) {
							return false;
						},
						false
					),
					$.revision.request()
				)
				.done(function() {
					var
						_source,
						_target,
						_search,
						_linkText,
						_addDesc = {},
						allNode = svg.allNode();
					for(var i=0;i<add.length;i++) {
						_source = add[i].source;
						_target = add[i].target;
						_search = $.wikibok.getPageName(_target).replace(/ /g,'_');
						_linkText = '*[['+wgReps+'::'+_target+'|'+wgReps+':'+_search+']]';
						//BOK-XMLから消えていることを確認する
						if(allNode.filter(function(d) {return (d.name == _search);}).length < 1) {
							if(_source in _addDesc) {
								_addDesc[_source].push(_linkText);
							}
							else {
								_addDesc[_source] = [_linkText];
							}
						}
					}
					$.each(_addDesc,function(k,v) {
						$.wikibok.addWikiPage(k,'\n'+v.join('\n'),false);
					});
				})
				.promise();
			}
			/**
			 * 追加・削除・移動ノードの判別
			 */
			function eSetSeplate(a1,a2) {
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
			}
			var
				base_rev,
				head_rev,
				//サーバへのリクエスト回数をリセット
				request_count = 0;
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
							//更新作業中はタイマー機能を再開
							$.timer.start();
						},
						open : function() {
							var
								me = this,
								edit_count,
								eSet,
								addSet,
								delSet,
								tag;
							//更新作業中はタイマー機能を停止
							$.timer.stop();
							$.wikibok.requestCGI(
								'WikiBokJs::getBokRevision',
								[wgUserName],
								function(dat,stat,xhr) {return true;},
								function(xhr,stat,err) {return false;},
								false
							)
							.done(function(dat,stat,xhr) {
								head_rev = dat;
								//編集データあり
								if(head_rev.edit) {
									if(parseInt(base_rev.active) > parseInt(base_rev.base)) {
										//マージ実行
										treeway_merge(base_rev.active)
										.done(function(rev,eSet,represent){
											//データ登録
											insertMergeXml(rev,eSet)
											.done(function(addSet,delSet,nodes){
												//追加ノードについては、BOK名前空間に記事を追加
												if(addSet.length > 0) {
													//記事作成の試行(失敗は無視)
													$.each(addSet,function(d,i) {
														$.wikibok.createWikiPage(wgExtraNamespace[wgNsBok]+':'+i);
													});
												}
												//
												if(wgRepsFlg) {
													if(represent != undefined && represent.ok != undefined) {
														setRepresentData(represent.ok)
														.always(function() {
															//記事書換え結果に関係なく、マージは成功扱い[一応処理待ち]
															$.revision.setRev();
															$(me).dialog('close');
															//結果表示
															resultDialog($.wikibok.wfMsg('wikibok-merge','conflict','add'),nodes.add);
															resultDialog($.wikibok.wfMsg('wikibok-merge','conflict','del'),nodes.del);
															resultDialog($.wikibok.wfMsg('wikibok-merge','conflict','move'),nodes.move);
														});
													}
												}
												else {
												//代表表現を使用しない場合、負荷軽減
													$.when(
														$.wikibok.requestCGI(
															'WikiBokJs::getBokJson',
															[0,wgUserName],
															function(rDat,rStat,rXhr) {
																//表示更新
																svg.load(rDat.xml);
																return true;
															},
															function(rXhr,rStat,rErr) {
																return false;
															},
															false
														),
														$.revision.request()
													)
													.always(function() {
														//記事書換え結果に関係なく、マージは成功扱い[一応処理待ち]
														$.revision.setRev();
														$(me).dialog('close');
														//結果表示
														resultDialog($.wikibok.wfMsg('wikibok-merge','conflict','add'),nodes.add);
														resultDialog($.wikibok.wfMsg('wikibok-merge','conflict','del'),nodes.del);
														resultDialog($.wikibok.wfMsg('wikibok-merge','conflict','move'),nodes.move);
													});
												}
											})
											.fail(function(){
												//再実行開始...
												$(me).dialog('close');
												$(me).dialog('open');
											});
										})
										.fail(function(message,represent) {
											//BOK-XMLには変更がない
											if(wgRepsFlg) {
												//代表表現を更新
												if(represent.ok.length > 0) {
													//ループにならないもののみ更新
													setRepresentData(represent.ok)
													.always(function() {
														//BOK-XML編集データをクリア
														$.wikibok.requestCGI(
															'WikiBokJs::clearEditHistory',
															[],
															function(dat,stat,xhr) {return true;},
															function(dat,stat,xhr) {return true;}
														)
														.done(function() {
															//結果表示
															$.wikibok.timePopup($.wikibok.wfMsg('common','check'),message,-1);
															$(me).dialog('close');
															$.revision.allsync();
														});
													});
												}
												else {
													//BOK-XML編集データをクリア
													$.wikibok.requestCGI(
														'WikiBokJs::clearEditHistory',
														[],
														function(dat,stat,xhr) {return true;},
														function(dat,stat,xhr) {return true;}
													)
													.done(function() {
														//結果表示
														$.wikibok.timePopup($.wikibok.wfMsg('common','check'),message,-1);
														$(me).dialog('close');
														$.revision.allsync();
													});
												}
											}
											else {
												$(me).dialog('close');
												$.wikibok.timePopup(
													$.wikibok.wfMsg('common','check'),
													message,
													-1
												);
											}
										})
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
											$.revision.allsync();
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
			var
				tmp = '<dl><dt>'+$.wikibok.wfMsg('wikibok-edittool','save_as','body','title')+'</dt>'
						+ '<dd title="'+$.wikibok.wfMsg('wikibok-edittool','save_as','input','title')+'"><input type="text" class="name"/></dd>'
						+ '<dt>'+$.wikibok.wfMsg('wikibok-edittool','save_as','body','comment')+'</dt>'
						+ '<dd title="'+$.wikibok.wfMsg('wikibok-edittool','save_as','body','comment')+'"><textarea class="comment" rows="10"/></dd>'
						+ '</dl>',
				_open = true;
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-edittool','save_as','title'),
				tmp,
				{
					create : function() {
						$(this).dialog('widget').setInterruptKeydown([
							{class : 'name',next : 'comment',prev : 'commit'},
							{class : 'comment',next : 'commit',prev : null}
						]);
					},
					focus : function() {
						if(_open) {
							_open = false;
							$(this).find('input.comment').val('');
							$(this).find('textarea.name').focus().val('');
						}
					},
					buttons : [{
						text : $.wikibok.wfMsg('wikibok-edittool','save_as','button_commit','text'),
						title: $.wikibok.wfMsg('wikibok-edittool','save_as','button_commit','title'),
						class: $.wikibok.wfMsg('wikibok-edittool','save_as','button_commit','class'),
						click : function() {
							var
								dialog = $(this),
								_message = true,
								_title = dialog.find('input.name').val(),
								_comment = dialog.find('textarea.comment').val();
							if(_title == '') {
								_message = 'notitle'
							}
							if(_comment == '') {
								_message = 'nocomment'
							}
							if(_message == true) {
								$.wikibok.requestCGI(
									'WikiBokJs::saveBokSvgData',
									[_title,_comment,$.wikibok.allDescriptionPage(),$.wikibok.getReps()],
									function(dat,stat,xhr) {
										return (dat !== false);
									},
									function(xhr,stat,err) {
										return false;
									}
								)
								.done(function(dat,stat,xhr) {
									var
										addMes = $.wikibok.escapeHTML(wgServer+wgScript+'/'+wgPageName+'?'+dat);
									$.wikibok.timePopup(
										$.wikibok.wfMsg('wikibok-edittool','save_as','title'),
										$.wikibok.wfMsg('wikibok-edittool','save_as','success')+addMes,
										-1
									);
								})
								.fail(function(dat) {
									$.wikibok.timePopup(
										$.wikibok.wfMsg('wikibok-edittool','save_as','title')+' '+$.wikibok.wfMsg('common','error'),
										$.wikibok.wfMsg('wikibok-edittool','save_as','error','duplication'),
										5000
									);
								})
								.always(function() {
									$(this).dialog('close');
								});
							}
							else {
								$.wikibok.timePopup(
									$.wikibok.wfMsg('wikibok-edittool','save_as','title')+' '+$.wikibok.wfMsg('common','error'),
									$.wikibok.wfMsg('wikibok-edittool','save_as','error',_message),
									5000
								);
							}
						}
					},{
						text : $.wikibok.wfMsg('common','button_close','text'),
						title: $.wikibok.wfMsg('common','button_close','title'),
						class: $.wikibok.wfMsg('common','button_close','class'),
						click : function() {
							$(this).dialog('close');
						}
					}]
				}
			);
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
	$('#wikibok-history-rev')
		.on('click','.first',function(){
			historyView(1,$.wikibok.getUrlVars('#'));
		})
		.on('click','.prev',function(){
			var
				rev = parseInt($('#wikibok-history-rev').find('.pagedisplay').val()) - 1;
			rev = (rev < 1) ? 1 : rev;
			historyView(rev,$.wikibok.getUrlVars('#'));
		})
		.on('click','.next',function(){
			var
				rev = parseInt($('#wikibok-history-rev').find('.pagedisplay').val()) + 1;
			historyView(rev,$.wikibok.getUrlVars('#'));
		})
		.on('click','.last',function(){
			historyView(0,$.wikibok.getUrlVars('#'));
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
		return (arguments.length < 1 || a == undefined) ?
		$.wikibok.requestCGI(
			'WikiBokJs::getBokJson',
			[0,wgUserName],
			function(dat,stat,xhr) {
				svg.load(dat.xml);
				$.revision.setRev(dat.act);
				return true;
			},
			function(xhr,stat,err) {
				return false;
			},
			false
		) : $.wikibok.requestCGI(
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
	function _focus() {
		var
			args = Array.prototype.slice.apply(arguments),
			node = (args.length < 1 || args[0] == undefined) ? false : args[0];
		//ハッシュタグまたはデフォルト値を強調
		if(node != false) {
			actNode(node);
		}
		else {
			$(window).scrollTo('50%');
		}
	}
	/**
	 * 過去データ確認用
	 */
	function historyView(revs,name) {
		$.wikibok.loadDescriptionPages(revs)
		.done(function() {
			$.wikibok.requestCGI(
				'WikiBokJs::getBokJson',
				[revs],
				function(dat,stat,xhr) {
					svg.load(dat.xml);
					$('#wikibok-history-rev').find('.pagedisplay').val(dat.act);
					return true;
				},
				function(xhr,stat,err) {
					return false;
				},
				false
			)
			.done(function() {_focus(name);})
			.fail(function() {return false;});
		})
		.fail(function(){
		});
	}
	/**
	 * 個別保存データ確認用
	 */
	function saveView() {
		var
			user = $.wikibok.getUrlVars('user').value,
			title = $.wikibok.getUrlVars('title').value,
			name = $.wikibok.getUrlVars('#') || $.wikibok.wfMsg('defaultFocus') || '';
		
		$.wikibok.loadDescriptionPages(user,title)
		.done(function() {
			$.wikibok.requestCGI(
				'WikiBokJs::viewData',
				[user,title],
				function(dat,stat,xhr) {
					svg.load(dat.bok_xml);
					svg.update();
					return true;
				},
				function(xhr,stat,err) {
					return false;
				},
				false
			)
			.done(function() {_focus(name);})
			.fail(function() {return false;});
		})
		.fail(function(){
		});
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
	/**
	 * URLパラメータから編集可否を変更
	 */
	function editPanel() {
		var
			all_act = {
				view : true,
				load : false,
				history : false
			},
			_action = $.wikibok.getUrlVars('action').value || 'view',
			res = true;
		if(_action in all_act) {
			res = all_act[_action];
		}
		return res;
	}
	wgEdit = editPanel();

	//アクション選択
	switch($.wikibok.getUrlVars('action').value) {
		case 'load':
			//保存済みデータの表示
			saveView();
			break;
		case 'history':
			historyView($.wikibok.getUrlVars('rev').value,($.wikibok.getUrlVars('#') || $.wikibok.wfMsg('defaultFocus') || ''));
			break;
		default:
			//その他(通常表示)
			$.when(
				$.wikibok.loadDescriptionPages(),
				loadBokXml()
			)
			.done(
				function(d) {
					var
						h = $.wikibok.getUrlVars('#') || $.wikibok.wfMsg('defaultFocus') || '';
					_focus(h);
					//定期更新の予約(記事情報取得)
					$.timer.add(function() {
						$.wikibok.loadReps()
						.always(function() {
							svg.update();
						});
					},true);
					$.timer.add(function() {
						$.wikibok.loadDescriptionPages()
						.done(function() {
							$.revision.sync();
						});
					});
				}
			);
			break;
	}
});
