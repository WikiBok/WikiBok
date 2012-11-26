;(function($) {
	$.extend({
		wikibok : new function() {
			var
				allreps = {},
				description_pages = {},
				desc_xhr = false;
			/**
			 * RGBオブジェクト形式の値をHEX(6桁)形式に変換
			 *	- 「#」は付加しない
			 */
			function RGBToHex(rgb) {
				//各値を16進数に変換
				var hex = [
					rgb.r.toString(16),
					rgb.g.toString(16),
					rgb.b.toString(16)
				];
				//各値が2桁以下になった場合、0を補完
				$.each(hex, function(i,v) {
					if(v.length == 1) {
						hex[i] = '0'+v;
					}
				});
				//文字列として返却
				return hex.join('');
			}
			/**
			 * HEX形式の値をRGBオブジェクト形式に変換
			 */
			function ToRGB(hex) {
				//「#」を含む場合、取り除いて処理
				var shex = (hex.indexOf('#') > -1) ? hex.substring(1) : hex,
					hex = parseInt(shex,16),
					res = {r:0,g:0,b:0};
				switch(shex.length) {
					case 6:
						res.r = (hex & 0xFF0000) >> 16;
						res.g = (hex & 0x00FF00) >> 8;
						res.b = (hex & 0x0000FF);
						break;
					case 3:
						//3桁の場合、各値をF=>FFとして計算(W3C規格?)
						res.r = ((hex & 0xF00) >> 8) * 0x11;
						res.g = ((hex & 0x0F0) >> 4) * 0x11;
						res.b = (hex & 0x00F) * 0x11;
						break;
				}
				return res;
			}
			/**
			 * 配列内の重複を削除
			 *	- $.uniqueとは異なり、返却する配列をソートしない
			 * @param -1- 対象配列
			 */
			function array_unique() {
				var
					args = Array.prototype.slice.call(arguments),
					m = (args.length < 1 || args[0] == undefined) ? [] : args[0],
					_chk = {},
					_res = [];
				for(var i=0;i<m.length;i++) {
					//チェック済み確認
					var k = m[i];
					if(!(k in _chk)) {
						_chk[k] = true;
						_res.push(k);
					}
				}
				return _res;
			}
			/**
			 * 言語対応データより文言を取得
			 * @param ... 複数指定可、PHP配列キーを順番に記述
			 */
			function wfMsg() {
				//複数キー指定対応(配列ではなくした...)
				var
					args = Array.prototype.slice.call(arguments),
					mes = meta_message,
					res = '';
				//パラメータ指定がない場合、空文字を返す
				if(args.length < 1) return '';
				if($.isArray(args)) {
					for(var i=0;i<args.length;i++) {
						var _res = mes[args[i]];
						//配列キーを順に確認
						if(_res == undefined) {
							break;
						}
						else if((typeof _res == 'string') ||
								(typeof _res == 'number')) {
							mes = _res;
							break;
						}
						else {
							mes = _res;
						}
					}
				}
				else {
					//たぶんこっちには来ない...
					var _res = mes[args];
					if((typeof _res == 'string') || (typeof _res == 'number')) {
						mes = _res;
					}
					else {
						mes = 'Array['+arg+']';
					}
				}
				return mes;
			}
			/**
			 * ページ名称の取得(省略時は表示中のページ名称を返す)
			 * @param -1- [省略可]ページ名称
			 */
			function getPageName() {
				var
					args = Array.prototype.slice.call(arguments),
					page = (args.length < 1 || args[0] == undefined) ? wgPageName : args[0];
				return page.slice(page.indexOf(':')+1);
			}
			/**
			 * 名前空間の取得
			 *	 - 省略時は表示中のページの名前空間を返す
			 *		 デフォルトはDescription用の名前空間
			 * @param -1- [省略可]検査対象のページ
			 * @param -2- [省略可]ページ名に名前空間を含まない場合の戻り値
			 */
			function getPageNamespace() {
				var
					args = Array.prototype.slice.call(arguments),
					ns = (args.length < 2 || args[1] == undefined) ? wgExtraNamespace[wgNsDesc] : args[1],
					page=(args.length < 1 || args[0] == undefined) ? wgPageName : args[0],
					idx = page.indexOf(':');
				return (idx < 0) ? ns : page.slice(0,idx);
			}
			/**
			 * 種別+項目名の2つでユニークIDを作成
			 * @param a 種別指定
			 * @param b 項目別指定
			 */
			function uniqueID(a,b) {
				var ids = getTypeID(a,b),
					id = '';
				if(ids.length < 1) {
					//新規ID作成
					var ids = getTypeID(a),
						id = _unique(a+'_');
					//取得済みデータとして登録
					ids.push({name : b,id : id});
					$.data($('body').get(0),a,ids);
				}
				else {
					id = ids[0].id;
				}
				return id;
			}
			/**
			 * 種別[+項目名]を指定してユニークIDを取得
			 * @param -1- 種別指定
			 * @param -2- 項目別指定(省略可)
			 */
			function getTypeID() {
				var
					args = Array.prototype.slice.call(arguments),
					elem = $('body').get(0),
					ids = (args.length < 1) ? [] : $.data(elem,args[0]);
					return (ids == undefined) ? [] : ((args.length < 2) ? ids : ids.filter(function(d){return (d.name == args[1]);}));
			}
			/**
			 * WikiBOKで統一したダイアログボックスを作成
			 * @param -1- タイトル
			 * @param -2- 内容
			 * @param -3- 追加パラメータ(jquery.ui.dialog参照)
			 * @param -4- 同タイトルで複数作成する場合の識別文字列
			 */
			function exDialog() {
				var
					args = Array.prototype.slice.call(arguments),
					a = (args.length < 1) ? '' : args[0],
					b = (args.length < 2) ? '' : args[1],
					c = (args.length < 3) ? '' : args[2],
					d = (args.length < 4) ? false : args[3],
					baseId = uniqueID('dialog',a),
					copy = (d != false),
					id = (copy) ? uniqueID(baseId,d) : baseId,
					mid = '#'+id,
					opt = $.extend({},{
						title : a,
						buttons : [
							{
								text : wfMsg('common','button_close','text'),
								title: wfMsg('common','button_close','title'),
								class: wfMsg('common','button_close','class'),
								click: function() {
									$(this).dialog('close');
								}
							}
						],
						autoOpen : true,
						position : 'center'
					},c);

				//ダイアログ対象要素の存在確認
				if($(mid).length == 0) {
					var content = $('<div></div>');
					//デフォルト設定[ID/Class]
					content.attr('id',id)
						.addClass('wikibok-exdialog')
						.addClass(a)
						.toggleClass('hide',true);
					$('body').append(content);
				}
				//ダイアログ作成イベント
				$('body').on('dialogcreate.wikibok',mid,function(){
					var
						pw = $(this).dialog('option','width'),
						ph = $(this).dialog('option','height'),
						cw,
						ch,
						_add;
					$(this).prev().find('.ui-dialog-titlebar-close').hide();
					//追加コンテンツ
					if(typeof b == 'string') {
						content.html(b);
					}
					else if(typeof b == 'object'){
						//HTML要素として使用できない場合...
						if($.isPlainObject(b)) {
							//何もしない...
						}
						else {
							_add = (copy) ? b.clone(true) : b;
							content.append(_add);
							_add.show();
						}
					}
					//内部要素が表示できないと困るので、サイズ比較...
					cw = Math.max.apply({},$(content).find('*').map(function(){return $(this).width();})) + 100;
					ch = Math.max.apply({},$(content).find('*').map(function(){return $(this).height();})) + 30;
					if(pw < cw) {$(this).dialog('option','width',cw);}
					if(ph < ch) {$(this).dialog('option','height',ch);}
				});
				$(mid).dialog(opt);
				if($(mid).dialog('isOpen')) {
					$(mid).dialog('moveToTop');
				}
				else {
					if(opt.autoOpen) {
						$(mid).dialog('open');
					}
				}
				return mid;
			}
			/**
			 * WikiBok独自のサーバ処理(CGI)を呼び出す
			 * @param -1- 呼び出し対象関数 [※PHP側で呼び出し関数として登録必要]
			 * @param -2- 呼び出し対象関数へ設定する引数 
			 *            第5引数以降の最終引数にFALSEを設定しない場合、以下2つを先頭に自動補完する
			 *              1.編集中リビジョン番号
			 *              2.ユーザ名称
			 * @param -3- サーバ通信成功時に実行するJs関数
			 *            関数実行結果を元にJs関数で判定が必要な場合、ここに指定する
			 *            Deferred関数でラップした場合、設定関数の戻り値が
			 *            TRUEであれば、成功後続処理を
			 *            FALSEであれば、失敗後続処理を誘発する
			 * @param -4- サーバ通信失敗時に実行するJs関数
			 *            関数実行結果を元にJs関数で判定が必要な場合、ここに指定する
			 *            Deferred関数でラップした場合、必ず失敗後続処理を誘発する
			 * @param -5- 引数の自動補完をする[TRUE]/しない[FALSE] [省略時:TRUE]
			 */
			function requestCGI() {
				var me = this,
					args = Array.prototype.slice.apply(arguments),
					argPlus = (args.length < 5) ? true : args.pop(),
					rs = args.shift() || 'WikiBokJs::dummy',
					rsargs = args.shift() || [],
					sfunc = args.shift() || function(){return true;},
					efunc = args.shift() || function(){};
				//最新リビジョン+ユーザIDを自動付加する
				if(argPlus) {
					rsargs = $.merge([$.revision.getRev(),wgUserName],rsargs);
				}
				//Deferredオブジェクトを返却
				return $.Deferred(function(def) {
					$.ajax({
						type : 'POST',
						dataType : 'JSON',
						url : wgServer+wgScriptPath+'/index.php',
						data : {
							action : 'ajax',
							rs : rs,
							rsargs : rsargs,
						},
						success : function(dat,stat,xhr) {
							//成功時実行関数でTRUEを返す場合のみOK
							if(sfunc.apply(me,arguments)) {
								def.resolve.apply({},arguments);
							}
							else {
								def.reject.apply({},arguments);
							}
						},
						error : function(xhr,stat,err) {
							efunc.apply(me,arguments);
							def.reject.apply({},arguments);
						},
						async : true,
						cache : false,
					});
				}).promise();
			}
			/**
			 * MediawikiAPIへのリクエストを送信する
			 */
			function requestAPI() {
				var me = this,
					args = Array.prototype.slice.apply(arguments),
				//第４引数に同期通信をONにするパラメータを設定
					async = (args.length < 4) ? true : args.pop(),
					rs = args.shift() || {},
					postData = $.extend({},{
						format : 'json'
					},rs),
					sfunc = args.shift() || function(){return true;},
					efunc = args.shift() || function(){};

				//再帰呼出しが多いため、Deferredオブジェクトを返さない
				// -> 再帰呼出しごとに終了関数が呼ばれてしまうため予期した動きになり難い
				return $.Deferred(function(def) {
					$.ajax({
						type : 'POST',
						dataType : 'JSON',
						url : wgServer+wgScriptPath+'/api.php',
						data : postData,
						success : function(dat,stat,xhr) {
							if(sfunc.apply(me,arguments)) {
								def.resolve.apply({},arguments);
							}
							else {
								def.reject.apply({},arguments);
							}
						},
						error : function(xhr,stat,et) {
							efunc.apply(me,arguments);
							def.reject.apply({},arguments);
						},
						async : async,
						cache : false,
					});
				}).promise();
			}
			/**
			 * 記事一覧を取得する
			 * @param -1- 一覧取得開始名称[省略時:先頭から]
			 * @param -2- 単一記事のみ取得する/しない[省略時:複数取得]
			 */
			function _description() {
				var
					def = this,
					args = Array.prototype.slice.apply(arguments),
					next  = (args.length < 1 || args[0] == undefined) ? false : args[0],
					limit = (args.length < 2 || args[1] == undefined || args[1] == false) ? 500 : 1,
					_pdata = (next==false) ? {
						action : 'query',
						prop : 'info',
						generator : 'allpages',
						gapnamespace : wgNsDesc,
						gaplimit : limit
					} : {
						action : 'query',
						prop : 'info',
						generator : 'allpages',
						gapnamespace : wgNsDesc,
						gaplimit : limit,
						gapfrom : next
					};
				//リクエスト
				requestAPI(
					_pdata,
					function(dat,stat,xhr) {
						if(dat['query'] != undefined && dat['query']['pages'] != undefined) {
							var
								pages = dat['query']['pages'],
								page,
								_name,
								_namespace;
							for(var k in pages) {
								page = pages[k];
								_name = getPageName(page.title);
								_namespace = getPageNamespace(page.title);
								description_pages[_name] = {
									name : _name,
									namespace : _namespace,
									size : page.length,
									id : k,
									title : page.title,
									ns : page.ns,
									rev : page.lastrevid
								}
							}
						}
						//記事1件のみの場合、再帰する必要なし
						if(limit == 1) {
							def.resolve(page);
						}
						else {
							if(dat['query-continue'] == undefined) {
								//続きがないので終了
								def.resolve(description_pages);
							}
							else {
								//続きがあるので再帰呼出し
								_description.call(def,dat['query-continue']['allpages']['gapfrom']);
							}
						}
					},
					function(xhr,stat,err) {
						def.reject();
					}
				)
			}
			/**
			 * サーバから記事情報をすべて取得
			 */
			function loadDescriptionPages() {
				var
					args = Array.prototype.slice.apply(arguments),
					now = (args.length < 1) ? true : false,
					def = $.Deferred();
				if(now) {
					//現時点の最新データを取得
					_description.call(def);
				}
				else {
					$.wikibok.requestCGI(
						'WikiBokJs::getDisplog',
						args,
						function(dat,stat,xhr) {
							if(dat!==false) {
								for(var desc in dat.description_pages) {
									desc.ns = parseInt(desc.ns);
									desc.rev = parseInt(desc.rev);
									desc.size = parseInt(desc.size);
								}
								description_pages = dat.description_pages;
								allreps = dat.allreps;
								return true;
							}
							else {
								return false;
							}
						},
						function(xhr,stat,err) {
							return false;
						},
						false
					)
					.done(function() {
						def.resolve();
					})
					.fail(function() {
						def.reject();
					});
				}
				return def.promise();
			}
			/**
			 * 記事一覧を名称で検索
			 * @param -1- 記事名称
			 * @param -2- 部分一致検索ON/OFF [省略時ON]
			 * @param -3- 空白記事かどうかをチェックする(空白でないもののみ返す)/しない [省略時OFF]
			 */
			function findDescriptionPage() {
				var
					args = Array.prototype.slice.apply(arguments),
					a = (args.length < 1 || args[0] == undefined) ? '' : args[0],
					b = (args.length < 1 || args[1] == undefined) ? false : args[1],
					c = (args.length < 1 || args[2] == undefined) ? false : args[2],
					inp = a.replace(/\W/g,'\\$&').replace(/ /g,'_'),
					reg = new RegExp((!b) ? ('^'+inp+'$') : inp),
					pagesize = (c == true) ? 1 : 0;
				return $.map(description_pages,function(d) {
					var _name = d.name.replace(/ /g,'_');
					if(_name.match(reg)) {
						if(d.size >= pagesize) {return d;}
					}
				});
			}
			/**
			 * 記事編集用テキスト取得
			 */
			function getDescriptionEdit(_page,_prop,_rvprop) {
				var
					def = $.Deferred(),
					prop = array_unique($.merge([
						'info',
						'revisions',
					],(_prop || []))),
					rvprop = array_unique($.merge([
						'content'
					],(_rvprop || []))),
					_pdata = {
						action : 'query',
						intoken: 'edit',
						prop : prop.join('|'),
						rvprop : rvprop.join('|'),
						titles : ($.isArray(_page) ? _page.join('|') : _page),
					};
				requestAPI(
					_pdata,
					function(dat,stat,xhr) {
						if(dat['query'] != undefined && dat['query']['pages'] != undefined) {
							def.resolve(dat);
						}
						else {
							def.reject(dat);
						}
					},
					function(xhr,stat,err) {
						def.reject();
					}
				);
				return def.promise();
			}
			function getDescriptionRevision() {
				var
					args = Array.prototype.slice.apply(arguments),
					_page = (args.length < 1 || args[0] == undefined) ? '' : args[0],
					_rev = (args.length < 2 || args[1] == undefined) ? false : args[1],
					def = $.Deferred(),
					//デフォルトに追加
					prop = ['text','displaytitle','revid'],
					_pdata = $.extend({},{
						action : 'parse',
						prop : prop.join('|'),
						page : getPageNamespace(_page)+':'+getPageName(_page),
						oldid : _rev
					});
				requestAPI(
					_pdata,
					function(dat,stat,xhr) {
						if(dat['parse'] != undefined && dat['parse']['text']['*'] != undefined && dat['parse']['displaytitle'] != undefined) {
							//記事の取得に成功
							if(dat['parse']['revid'] == 0) {
								//記事が存在しない場合
								def.reject(dat);
							}
							else {
								def.resolve(dat);
							}
						}
						else {
							def.reject(dat['error']);
						}
					},
					function(xhr,stat,err) {
						def.reject();
					}
				);
				return def.promise();
			}
			/**
			 * 記事1件分を取得
			 * @param -1- 記事名称
			 * @param -2- 取得内容(Wiki-APIに準拠)
			 */
			function getDescriptionPage() {
				var
					args = Array.prototype.slice.apply(arguments),
					_page = (args.length < 1 || args[0] == undefined) ? '' : args[0],
					_prop = (args.length < 2 || args[1] == undefined) ? [] : args[1],
					def = $.Deferred(),
					//デフォルトに追加
					prop = array_unique($.merge([
						'text',
						'displaytitle',
						'revid'
					],_prop)),
					_pdata = $.extend({},{
						action : 'parse',
						prop : prop.join('|'),
						page : getPageNamespace(_page)+':'+getPageName(_page),
					});
				requestAPI(
					_pdata,
					function(dat,stat,xhr) {
						if(dat['parse'] != undefined && dat['parse']['text']['*'] != undefined && dat['parse']['displaytitle'] != undefined) {
							//記事の取得に成功
							if(dat['parse']['revid'] == 0) {
								//記事が存在しない場合
								def.reject(dat);
							}
							else {
								def.resolve(dat);
							}
						}
						else {
							def.reject(dat['error']);
						}
					},
					function(xhr,stat,err) {
						def.reject();
					}
				);
				return def.promise();
			}
			/**
			 * URLパラメータを取得
			 * @param -1- パラメータ名称[省略時:全パラメータ]/[#:ネーム]
			 */
			function getUrlVars() {
				var
					args = Array.prototype.slice.apply(arguments),
					a = (args.length < 1 || args[0] == undefined) ? false : args[0],
					_query = window.location.search,
					_name = window.location.hash,
					query = _query.slice(_query.indexOf('?')+1),
					name = _name.slice(_name.indexOf('#')+1),
					hashes = query.split('&'),
					vars = [];
				//名称
				if(a == false) {
					vars = hashes;
				}
				else if(a == '#') {
					vars = name;
				}
				else {
					for(var i=0;i<hashes.length;i++) {
						var
							hash = hashes[i].split('='),
							dhash1 = decodeURI(hash[0]),
							dhash2 = (hash[1] == undefined) ? true : decodeURI(hash[1]);
						//指定パラメータのみ
						if(dhash1 == a) {
							vars = {name : dhash1,value: dhash2};
						}
					}
				}
				return vars;
			}
			/**
			 * 記事参照ダイアログ
			 * @param -1- 表示記事名称
			 * @param -2- 表示記事内容
			 * @param -3- パラメータ
			 */
			function viewDescriptionDialog() {
				var
					args = Array.prototype.slice.apply(arguments),
					a = (args.length < 1 || args[0] == undefined) ? '' : args[0],
					b = (args.length < 2 || args[1] == undefined) ? '' : args[1],
					_mode = (args.length < 3 || args[2] == undefined) ? 'view' : args[2],
					_rev = (args.length < 4 || args[3] == undefined) ? false : args[3],
					myDef = $.Deferred(),
					_open = true,
					_btn = [],
					_title = getPageNamespace(a)+':'+getPageName(a),
					_edit = {
						text : wfMsg('common','button_edit','text'),
						title: wfMsg('common','button_edit','title'),
						class: wfMsg('common','button_edit','class'),
						click: function() {
							$(this).dialog('close');
							getDescriptionEdit(_title)
							.done(function(dat) {
								var
									page = dat.query.pages,
									edesc = $.map(page,function(d) {
										return (d.revisions) ? $.map(d.revisions,function(d) {
											return d['*'];
										}).join() : '';
									}).join(),
									token = $.map(page,function(d) {return d.edittoken;}).join(),
									timestamp = $.map(page,function(d) {return d.starttimestamp;}).join();
								//編集結果をAPIで反映してから,BOK-XMLへ反映する/しない
								editDescriptionDialog(_title,edesc,{
									title : _title,
									token : token,
									basetimestamp : timestamp,
								})
								.done(function(res) {
									myDef.resolve(res);
								});
							});
						}
					},
					_make = {
						text : wfMsg('wikibok-new-element','bok','button_create','text'),
						title: wfMsg('wikibok-new-element','bok','button_create','title'),
						class: wfMsg('wikibok-new-element','bok','button_create','class'),
						click: function() {
							$(this).dialog('close');
							myDef.resolve(true);
						}
					},
					_close = {
						text : wfMsg('common','button_close','text'),
						title: wfMsg('common','button_close','title'),
						class: wfMsg('common','button_close','class'),
						click: function() {
							$(this).dialog('close');
							myDef.reject();
						}
					},
					_base = $('#wikibok-description-view');
				if(wgEdit == true) {
					switch(_mode) {
						case 'create' : 
							_btn.push(_make);
						case 'view' : 
						default :
							_btn.push(_edit);
							break;
					}
				}
				_btn.push(_close);
				//ダイアログを作成
				exDialog(
					wfMsg('wikibok-edittool','view','title'),
					_base,
					{
						buttons:_btn,
						focus : function() {
							//フォーカス切替
							var
								dialog = $(this),
								widget = dialog.dialog('widget'),
								act= widget.find(_selecter(wfMsg('common','button_close','class')));
							if(_open) {
								dialog.find('.title').html(titlelink(wgServer+wgScript,a,_rev));
								dialog.find('.wikibok-text').html(b);
								_open = false;
							}
							act.focus();
						}
					},
					a
				);
				return myDef.promise();
			}
			function titlelink() {
				var
					args = Array.prototype.slice.apply(arguments),
					base = (args.length < 1 || args[0] == undefined) ? '' : args[0],
					name = (args.length < 2 || args[1] == undefined) ? '' : args[1],
					old = (args.length < 3 || args[2] == undefined || args[2] == false) ? '' : '?oldid='+args[2],
					tmpl = '<a href="@base@/@title@@old@" target="_blank">@name@</a>';
					return tmpl
									.replace(/(@base@)/,base)
									.replace(/(@old@)/,old)
									.replace(/(@name@)/,getPageName(name))
									.replace(/(@title@)/,getPageNamespace(name)+':'+getPageName(name));
			}
			/**
			 * Description名称の変更
			 */
			function renamePage(a,b) {
				var
					fTitle = getPageNamespace(a)+':'+getPageName(a),
					tTitle = getPageNamespace(b)+':'+getPageName(b),
					myDef = $.Deferred(),
					edit_request = function(title,body,edit,timestamp) {
						var
							one_def = $.Deferred();
							pdata = (arguments.length < 4 || timestamp == undefined) ? {
								//タイムスタンプなし(新規作成)
								action : 'edit',
								summary: 'edit',
								title : title,
								text : body,
								token : edit,
								createonly : true,
							} : {
								//タイムスタンプあり(既存編集)
								action : 'edit',
								summary: 'edit',
								title : title,
								text : body,
								token : edit,
								basetimestamp : timestamp,
							}
						requestAPI(
							pdata,
							function(dat,stat,xhr) {
								if(dat.error == undefined) {
									one_def.resolve();
								}
								else {
									one_def.reject();
								}
							},
							function(xhr,stat,err) {
								one_def.reject();
							}
						);
						return one_def.promise();
					};
				//2つのDescriptionのEditTokenを取得
				getDescriptionEdit([fTitle,tTitle])
				.done(function(dat) {
					var
						page = dat.query.pages,
						rdata = $.map(page,function(a,b){
							return {
								name : a.title,
								desc : (a.revisions) ? $.map(a.revisions,function(d) {return d['*'];}).join() : '' ,
								token: a.edittoken,
								to   : (b==-1),
								from : (b!=-1),
								time : a.starttimestamp || 0,
							}
						}),
						fPage = rdata.filter(function(d){return d.from;}),
						tPage = rdata.filter(function(d){return d.to;}),
						fpage,
						tpage,
						desc;
					//変更元が存在する・変更先が存在しない
					if(fPage.length == 1 && tPage.length == 1) {
						fpage = fPage[0];
						tpage = tPage[0];
						//空白の場合、コピー新規できないので、署名で作成
						desc = (fpage==undefined || fpage.desc==undefined || fpage.desc == '') ? '--~~~~' : fpage.desc;
						//コピー新規
						edit_request(tpage.name,desc,tpage.token)
						.done(function() {
							//コピー元データの白紙化
							edit_request(fpage.name,'',fpage.token,fpage.time)
							.done(function() {
								//正常終了
								myDef.resolve();
							})
							.fail(function() {
								//コピー元データの削除に失敗・コピー新規を白紙化(Rollbackできない...)
								edit_request(tpage.name,'',tpage.token);
								myDef.reject();
							})
						})
						.fail(function() {
							myDef.reject();
						})
					}
					else {
						myDef.reject('エラー');
					}
				});
				return myDef.promise();
			}
			/**
			 * 記事作成
			 * @param a 記事名称
			 * @param b 記事内容
			 */
			function createWikiPage(a,b) {
				var
					myDef = $.Deferred(),
					_title = getPageNamespace(a)+':'+getPageName(a),
					_body = (arguments.length < 2 || b == undefined || b.length < 1) ? wfMsg('wikibok-empty-article') : b;

				getDescriptionEdit(_title)
				.done(function(dat) {
					var
						_pages = dat.query.pages,
						_token= $.map(_pages,function(d) {
							return d.edittoken || '';
						}).join(),
						_time = $.map(_pages,function(d) {
							return d.starttimestamp || '';
						}).join(),
						_post = {
							action : 'edit',
							summary: '[New Data]Written by WikiBokSystem',
							title : _title,
							text : _body,
							token : _token,
							createonly : true
						};
					//APIリクエスト
					requestAPI(
						_post,
						function(dat) {
							if('error' in dat) {
								//エラーコードを返却
								myDef.reject(dat.error);
							}
							else {
								myDef.resolve(dat);
							}
						},
						function(dat) {
							myDef.reject('RequestError');
						}
					);
				})
				.fail(function(){
					myDef.reject('GetTokenError');
				});
				return myDef.promise();
			}
			/**
			 * Wikiページに記事内容を追加する
			 * @param a ページ名称[名前空間含む]
			 * @param b ページ内容[追記内容のみ]
			 * @param c 編集競合を確認する/しない
			 */
			function addWikiPage(a,b,c) {
				var
					myDef = $.Deferred(),
					_title = getPageNamespace(a)+':'+getPageName(a),
					_body = (arguments.length < 2 || b == undefined) ? '' : b,
					_force= (arguments.length < 3 || c == undefined) ? false : c;
				//編集用データ取得
				getDescriptionEdit(_title)
				.done(function(dat) {
					var
						_pages = dat.query.pages,
						_desc = $.map(_pages,function(d) {
							return (d.revisions) ? $.map(d.revisions,function(d) {
								return d['*'];
							}).join() : '';
						}).join(),
						_token= $.map(_pages,function(d) {
							return d.edittoken || '';
						}).join(),
						_time = $.map(_pages,function(d) {
							return d.starttimestamp || '';
						}).join(),
						_base = {
							action : 'edit',
							summary: '[Add Data]Written by WikiBokSystem',
							title : _title,
							text : _desc+_body,
							token : _token,
						},
						_post = (_force) ? $.extend({},_base,{basetimestamp : _time}) : _base;
					//APIリクエスト
					requestAPI(
						_post,
						function(dat) {
							if('error' in dat) {
								//エラーコードを返却
								myDef.reject(dat.error);
							}
							else {
								myDef.resolve(dat);
							}
						},
						function(dat) {
							myDef.reject('RequestError');
						}
					);
				})
				.fail(function(){
					myDef.reject('GetTokenError');
				});
				return myDef.promise();
			}
			/**
			 * @param a 記事名称
			 * @param b 記事内容
			 * @param c EditTokenを含むその他オプション情報(ハッシュ)
			 */
			function postEditData(a,b,c) {
				var
					_title = getPageNamespace(a)+':'+getPageName(a),
					_body = b,
					_pdata = $.extend({},{
						action : 'edit',
						summary: 'edit',
						title : _title,
						text : _body,
					},c),
					def = $.Deferred(),
					mes = '';
				requestAPI(
					_pdata,
					function(dat,stat,xhr) {
						if(dat.error != undefined) {
							switch(dat.error.code) {
								case 'articleexists':
									//作成済み=>記事内容の表示
									getDescriptionPage(a)
									.done(function(dat) {
										var
											page = dat.parse,
											ptxt = $(page.text['*']),
											desc = (ptxt.html() == null) ? $('<div>'+wfMsg('wikibok-description','empty')+'</div>') : ptxt;
											//リンクを別タブ(ウィンドウ)で開く
											desc.find('a').attr({target:'_blank'});
										viewDescriptionDialog(a,desc,'create');
									})
									.always(function() {
										def.resolve(false);
									});
									break;
								case 'editconflict':
									//編集競合発生
									getDescriptionEdit(_title)
									.done(function(dat) {
										var
											page = dat.query.pages,
											edesc = $.map(page,function(d) {
												return (d.revisions) ? $.map(d.revisions,function(d) {
													return d['*'];
												}).join() : '';
											}).join(),
											token = $.map(page,function(d) {return d.edittoken;}).join(),
											timestamp = $.map(page,function(d) {return d.starttimestamp;}).join();
										//編集画面を再表示
										editDescriptionDialog(_title,edesc,{
											title : _title,
											token : token,
											basetimestamp : timestamp,
										},_diffString(_body,edesc))
										.always(function() {
											def.resolve(false);
										});
									});
									break;
								default:
									mes = wfMsg('wikibok-edit-description','error',dat.error.code);
									def.reject(mes);
									break;
							}
						}
						else {
							def.resolve(true);
						}
					},
					function(xhr,stat,err) {
						def.reject();
					}
				);
				return def.promise();
			}
			/**
			 * 記事編集ダイアログ
			 * @param a 編集対象記事名称
			 * @param b 編集開始時の記事
			 * @param c API呼び出しオプション
			 * @param d 編集競合発生時のDIFF-Object
			 */
			function editDescriptionDialog(a,b,c,d) {
				var
					_open = true,
					myDef = $.Deferred(),
					_pst = (arguments.length < 3 || c == undefined) ? {} : c,
					diff = (arguments.length < 4 || d == undefined) ? false : d,
					_diffElem,
					_headElem,
					_workElem;

				exDialog(
					wfMsg('wikibok-edittool','edit','title'),
					$('#wikibok-description-edit'),
					{
						create : function() {
							$(this).setTextEdit();
						},
						open : function() {
							$(this).dialog('widget').setInterruptKeydown([
								{class:'wikibok-text',next:'commit',prev:null}
							]);
						},
						focus : function() {
							if(_open) {
								_open = false;
								_diffElem = $(this).find('.wikibok-description-diff'),
								_headElem = _diffElem.find('.head > .txt'),
								_workElem = _diffElem.find('.work > .txt');
								//記事内容の表示変更
								$(this).find('.title').val(a);
								$(this).find('.wikibok-text').val(b);
								//編集競合の表示/非表示
								if(diff !== false) {
									_headElem.html(diff.n);
									_workElem.html(diff.o);
									_diffElem.show();
								}
								else {
									_diffElem.hide();
								}
							}
						},
						buttons : [{
							text : wfMsg('wikibok-edittool','button_commit','text'),
							title: wfMsg('wikibok-edittool','button_commit','title'),
							class: wfMsg('wikibok-edittool','button_commit','class'),
							click: function() {
								var
									me = this,
									_inTitle = $(this).find('.title').val(),
									_inBody = $(this).find('.wikibok-text').val();
								postEditData(_inTitle,_inBody,_pst)
								.done(function(dat) {
									if(dat) {
										//記事情報(空欄など)の更新(表示の更新はしていない)
										(function(){
											return $.Deferred(function(def){
												_description.call(def,getPageName(a),true);
											}).promise();
										}())
										.done(function(){
											//登録成功
											$(me).dialog('close');
										});
									}
									//正常終了時の引数判定で後続処理を記述する(EditConflictはFALSE扱い...)
									myDef.resolve(dat);
								})
								.fail(function(dat) {
									//登録失敗
									if(arguments.length < 1 || dat == undefined) {
									}
									else {
										timePopup(
											wfMsg('wikibok-new-element','title')+' '+wfMsg('common','error'),
											dat,
											5000
										);
									}
								});
							}
						},{
							text : wfMsg('common','button_close','text'),
							title: wfMsg('common','button_close','title'),
							class: wfMsg('common','button_close','class'),
							click: function() {
								$(this).dialog('close');
								myDef.reject();
							}
							
						}]
					},
					a
				);
				return myDef.promise();
			}
			/**
			 * 警告を一定時間のみ表示(自動で閉じる)
			 * @param a ダイアログタイトル
			 * @param b ダイアログ表示文字列
			 * @param c 表示している時間[マイクロ秒]
			 * @param d close時に実行する
			 */
			function timePopup(a,b,c,d) {
				var
					open = true;
				exDialog(
					a,
					b,{
					focus : function() {
						var
							me = this,
							t = $.data($(me).get(0),'timer');
						if(open) {
							open = false;
							$(this).html(b);
							//警告が別のものになった場合、自動で閉じるまでの時間をリセット
							if(t != null) {
								clearTimeout(t);
							}
						}
						//秒数が0以下の場合、自動で閉じない...
						if(c > 0) {
							$.data($(me).get(0),'timer',setTimeout(function() {
								$(me).dialog('close');
							},c));
						}
					},
					close : function() {
						var
							t = $.data($(this).get(0),'timer');
						if(t != null) {
							clearTimeout(t);
						}
						if($.isFunction(d)) {
							d.apply({},[a,b]);
						}
					}
				});
			}
			/**
			 * SMWリンクデータの読み込み(最新)
			 */
			function loadReps() {
				return requestCGI(
					'WikiBokJs::getSMWLinkData',
					[],
					function(dat,stat,xhr) {
						allreps = dat;
						return true;
					},
					function(xhr,stat,err) {
						return false;
					},
					false
				);
			}
			/**
			 * 代表表現リンク判定
			 * @param a 対象ノード名称
			 */
			function checkReps(a) {
				return (allreps == undefined || allreps[a] == undefined) ? false : true;
			}
			/**
			 * 代表表現リンク取得
			 */
			function getReps() {
				var
					args = Array.prototype.slice.call(arguments),
					res = (args.length < 1) ? allreps : allreps[args[0]];
				return (res == undefined) ? false : res;
			}
			return {
				array_unique : array_unique,
				wfMsg : wfMsg,
				uniqueID : uniqueID,
				getTypeID : getTypeID,
				exDialog : exDialog,
				requestCGI : requestCGI,
				requestAPI : requestAPI,
				getPageName : getPageName,
				getPageNamespace : getPageNamespace,
				loadDescriptionPages : loadDescriptionPages,
				findDescriptionPage : findDescriptionPage,
				allDescriptionPage : function(){return description_pages;},
				getDescriptionPage : getDescriptionPage,
				getDescriptionRevision : getDescriptionRevision,
				getDescriptionEdit : getDescriptionEdit,

				loadReps : loadReps,
				checkReps : checkReps,
				getReps : getReps,
				
				getUrlVars : getUrlVars,
				viewDescriptionDialog : viewDescriptionDialog,
				editDescriptionDialog : editDescriptionDialog,
				timePopup : timePopup,
				createWikiPage : createWikiPage,
				addWikiPage : addWikiPage,
				renamePage : renamePage,
				escapeHTML : _escapeHTML
			};
		},
		/**
		 * リビジョン番号関連オブジェクト
		 */
		revision : (function(){
			var
				me,
				allData,
				isReady = false,
				isRequest = false;
			/**
			 * リビジョン番号の管理オブジェクト初期設定
			 * @param a オブジェクトID[省略可:呼出しオブジェクト]
			 */
			function construct(a) {
				//HTML表示更新対象Objectの設定
				me = (arguments.length < 1 || a == undefined) ? $(this) : $(a);
				//サーバリクエスト開始[HTML更新は別に実施]
				request().done(function() {isReady = true;});
			}
			/**
			 * サーバリクエスト処理
			 */
			function request() {
				return $.Deferred(function(myDef) {
					//二重実行の阻止
					if(!isRequest) {
						isRequest = true;
						//リビジョン番号取得
						$.wikibok.requestCGI(
							'WikiBokJs::getBokRevision',
							[wgUserName],
							function(dat,stat,xhr) {
								//最新情報の取得
								allData = $.extend({},allData,dat);
								return true;
							},
							function(xhr,stat,err) {
								return false;
							},
							false
						)
						.done(function(dat) {
							myDef.resolve();
						})
						.fail(function() {
							myDef.reject();
						})
						.always(function() {
							isRequest = false;
						})
					}
					else {
						myDef.reject();
					}
				}).promise();
				
			}
			/**
			 * サーバリクエスト+表示更新(Timerによる定期実施)
			 */
			function sync() {
				request()
				.done(function() {
					updateView();
				});
			}
			/**
			 * サーバリクエスト+リビジョン番号最新設定+表示更新
			 */
			function allsync() {
				request()
				.done(function() {
					setRev();
				});
			}
			/**
			 * HTML表示の更新
			 */
			function updateView() {
				var
					dat = getData(),
					_edit = (dat === false) ? 0 : (parseInt(dat.active) - parseInt(dat.base));
				if(isReady && dat !== false) {
					me.find('.base').html(dat.base);
					me.find('.head').html(dat.head);
					me.find('.edit').html(_edit);
				}
			}
			/**
			 * リビジョン番号+表示更新
			 * @param a リビジョン番号[省略時:ユーザ最新リビジョン]
			 */
			function setRev(a) {
				if(isReady) {
					allData.active = (arguments.length < 1 || a == undefined) ? allData.user : a;
					updateView();
				}
			}
			/**
			 * 現在使用中のリビジョン番号
			 */
			function getRev() {
				return parseInt(getData('active'));
			}
			/**
			 * リビジョンデータ取得
			 * @param a 取得するデータの名称[省略時:Object形式ですべて取得]
			 */
			function getData(a) {
				if(allData == undefined) {
					return 0;
				}
				else {
					if(arguments.length < 1 || a == undefined || allData[a] == undefined) {
						return (allData || false);
					}
					else {
						return allData[a];
					}
				}
			}
			return {
				construct : construct,
				request : request,
				sync : sync,
				allsync: allsync,
				setRev : setRev,
				getRev : getRev,
				getData : getData,
				own : function(){return me;}
			};
		}()),
		/**
		 * タイマ関連オブジェクト
		 */
		timer : (function(){
			var
				tList = [],
				time = 100,
				timer;
			/**
			 * タイマ間隔設定
			 */
			function setIntervalTime(a) {
				if(timer) {
					stop();
				}
				time = a;
			}
			/**
			 * タイマで実施する関数の定義を追加
			 * @param f 実施関数
			 * @param first 初期実施フラグ[True:行う/False:行わない]
			 */
			function add(f,first) {
				var isAdded = false;
				if(typeof f == 'function') {
					for(var i=0;i<tList.length;i++) {
						if(tList[i].func === f) {
							isAdded = true;
							break;
						}
					}
					if(!isAdded) {
						tList.push({func : f,_tm : false});
						if(arguments.length > 1 && first) {
							run(i);
						}
					}
				}
				return (!isAdded);
			}
			/**
			 * タイマで実施する関数の定義を削除
			 * @param f 実施関数
			 */
			function remove(f) {
				var isRemove = false;
				if(typeof f == 'function') {
					for(var i=0;tList.length;i++) {
						if(tList[i].func === f) {
							tList.splice(i,1);
							isRemove = true;
							break;
						}
					}
				}
				if(tList.length < 1) {
					stop();
				}
				return isRemove;
			}
			/**
			 * タイマ計測開始
			 */
			function start() {
				stop();
				if(tList.length > 0) {
					run();
				}
			}
			/**
			 * タイマ計測停止
			 */
			function stop() {
				if(timer) {
					clearTimeout(timer);
				}
			}
			/**
			 * タイマ実施
			 * @param n タイマ設定番号
			 */
			function run(n) {
				function _run(j) {
					if(tList[j]._tm == false) {
						tList[j]._tm = true;
						$.when(
							tList[j].func()
						).done(function() {
							tList[j]._tm = false;
						});
					}
				}
				if(arguments.length < 1) {
					for(var i=0;i<tList.length;i++) _run(i);
				}
				else {
					if(n < tList.length) _run(n);
				}
				timer = setTimeout(arguments.callee,time);
			}
			//オブジェクトで利用するメソッド定義
			return {
				add : add,
				remove : remove,
				start : start,
				stop : stop,
				setIntervalTime : setIntervalTime
			};
		}()),
		drag : (function() {
			var
				_stX = 0,
				_stY = 0,
				_edX = 0,
				_edY = 0,
				_drE,
				_oldZindex = 0;
			function InitDragDrop(func) {
				$(this)
					.on('mousedown',_mousedown)
					.on('mouseup',_mouseup);
				_drE = func;
			}
			function _mousedown(e) {
				var
					target;
				if(e == null) {
					e = window.event;
				}
				target = (e.target != null) ? e.target : e.srcElement;
				
				_stX = e.clientX;
				_stY = e.clientY;
				_edX = _stX;
				_stY = _stY;
			}
			function _mouseup(e) {
				var
					target;
				if(e == null) {
					e = window.event;
				}
				target = (e.target != null) ? e.target : e.srcElement;
				
				_edX = e.clientX;
				_edY = e.clientY;
				if(_stX != _edX || _stY != _edY) {
					
					_drE.apply({},[{
						start: [Math.min.apply({},[_stX,_edX]),Math.min.apply({},[_stY,_edY])],
						end  : [Math.max.apply({},[_stX,_edX]),Math.max.apply({},[_stY,_edY])],
					},target]);
				}
				_stX = 0;
				_stY = 0;
				_edX = 0;
				_edY = 0;
			}
			
			return {
				InitDragDrop : InitDragDrop
			}
		}())
	});

	$.fn.extend({
		InitDragDrop : $.drag.InitDragDrop,
		revision : $.revision.construct,
		/**
		 * 同一行内に複数画像アイコンを設定する
		 *	 - 画像ファイルの指定は個別にCSSで設定
		 * @param a 追加するCSS設定(アイコンのサイズなどを指定)
		 * @param b 対象要素配下の内限定してアイコンを設定する場合、セレクタを指定
		 */
		lineicon : function(a,b) {
			var icons = (arguments.length < 2) ? $(this) : $(this).find(b),
				set = $.extend({},{},a),
				_wrap = $('<span></span>').css(set);
			icons.addClass('wikibok_icon').each(function() {
				var tb = $(this).html() || '',
					elem = this;
				_wrap.attr({'title':tb});
				$(this).wrap(_wrap);
			});
			icons.css(set);
			icons.filter(':not(:last)').after(
				$('<span></span>').css({'margin-left':(parseInt(set.width) + 2)+'px'})
			);
			icons.filter(':last').after(
				$('<span></span>').css({'margin-right':(parseInt(set.width) + 2)+'px'})
			);
			return this;
		},
		/**
		 * 対象要素の表示位置を固定
		 * @param a ハッシュ{
		 *		position : 基準位置[LT:左上/LB:左下/RT:右上/RB:右下]
		 *		x : 基準位置からの距離(横方向:px)
		 *		y : 基準位置からの距離(横方向:px)
		 * }
		 * @param b [TRUE]一時的に隠す/[FALSE]隠さない
		 */
		setPosition : function(a,b){
			var opt = $.extend({},{
				position : 'lt',
				//設定前の要素位置を設定
				base : $(this).offset(),
				x : 20,
				y : 20,
				slideSpeed : 'fast'
			},a);
			//絶対配置以外は元位置を考える必要なし
			if($(this).css('position') != 'absolute') {
				opt.base = {top : 0,left : 0};
			}
			return $.each(this,function() {
				if($(this).length < 1) return false;
				var timer = false,
					elem = $(this),
					_resize = [],
					touch = ('ontouched' in document),
					//要素の位置変更用関数
					change = function() {
						var set = arguments[0] || {},
							touch = arguments[1] || false,
							x = (document.documentElement.scrollLeft || document.body.scrollLeft),
							y = (document.documentElement.scrollTop || document.body.scrollTop),
							h = (touch)
								? (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0) 
								: $(window).height(),
							w = (touch)
								? (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0) 
								: $(window).width();
						switch(set.position.toLowerCase()) {
							case 'lt':
								x += set.x;
								y += set.y;
								break;
							case 'rt':
								x += w - set.x - $(this).width();
								y += set.y;
								break;
							case 'lb':
								x += set.x;
								y += h - set.y - $(this).height();
								break;
							case 'rb':
								x += w - set.x - $(this).width();
								y += h - set.y - $(this).height();
								break;
						}
						//親要素が位置変更されている場合を考慮(固定位置が画面外にならないようにする)
						$(this).css({
							top :(y > set.base.top) ? (y - set.base.top) : y,
							left:(x > set.base.left)? (x - set.base.left): x
						});
					},
					//イベント登録用関数
					setEvent = function() {
						var set = arguments[0] || {},
							touch = arguments[1] || false,
							elem = this;
						//リサイズ時イベント要素に追加
						_resize.push({e:elem,s:set,t:touch});
						//スクロール監視に追加(一部スクロール追随しない場合を考慮)
						WINDOW_APP.util.scrollMonitor.add(function() {
							change.call(elem,set,touch);
						});
						change.call(elem,set,touch);
					};
				//隠し要素に変更
				if(b) {
					var tmp = $('<div></div>').addClass('setPositionBtn'),
						set = $.extend({},opt,{x:5,y:20});
					//ボタンを追加
					tmp.insertBefore(elem).bind('click',function() {
						//表示/非表示の切り替えイベント
						elem.slideToggle(opt.slideSpeed,function() {
							tmp.toggleClass('active');
						})
					});
					//初期状態は非表示とする
					elem.slideUp(opt.slideSpeed);
					setEvent.call(tmp,set,touch);
					//ボタンと被らないようにX軸を移動
					opt.x += 32;
				}
				//設定時実施
				elem.addClass('setPosition');
				setEvent.call(elem,opt,touch);
				//リサイズ時にイベントを実施
				$(window).bind('resize',function() {
					//タイマ動作をキャンセル(リサイズ中は再描画しない...)
					if(timer !== false) {
						clearTimeout(timer);
					}
					timer = setTimeout(function() {
						for(var i=0;i<_resize.length;i++) {
							var e = _resize[i].e,
								s = _resize[i].s,
								t = _resize[i].t;
							change.call(e,s,t);
						}
					},500);
				});
				//入力中はスクロール追随しない
				elem.find('input:text').bind({
					focus : function() {WINDOW_APP.util.scrollMonitor.stop();},
					blur : function() {WINDOW_APP.util.scrollMonitor.start();}
				});
				return elem;
			});
		},
		/**
		 * データ入力時にキーボードによる要素間移動を設定
		 *	 - 決定キーを押下することでキーボードのみで確定まで行えるように...
		 * @param フォーカス遷移用のデータを設定[下記のハッシュ形式の配列]
		 *		{ class: 現在フォーカス中のクラス
		 *			next : Enterで移動する要素
		 *			prev : Shift+Enterで移動する要素	}
		 */
		setInterruptKeydown : function() {
			var me = $(this),
				args = Array.prototype.slice.apply(arguments),
				move = (args.length < 1) ? [{
						class : 'close',
						next : null,
						prev : null
					}] : args[0];
			return $.each(this,function() {
				var active = function(a) {
						//フォーカス切替
						var t = me.find(_selecter(a));
						if(t.length < 1) return false;
						return t.focus();
					};
				//初期フォーカス調整
				active(move[0].class);
				//フォーカスの遷移データを設定してイベントを定義
				me.on('keypress','input:text,input:password,textarea',{move : move},function(ev) {
					var t = $(ev.target),
						m = ev.data.move,
						//入力要素に対応したデータを取得
						_act = m.filter(function(d){ return t.hasClass(d.class);});
					if(_act.length < 1) {
						return false;
					}
					else {
						_act = _act[0];
					}
					if($(t).is('input')) {
						//1行入力のみはEnter/Shift+Enterで次/前へ移動
						if(ev.which == 13) {
							if(ev.shiftKey) {
								active(_act.prev);
								event.preventDefault();
							}
							else {
								active(_act.next);
								event.preventDefault();
							}
						}
					}
					else if($(t).is('textarea')) {
						//複数行入力はShift+Enterで次へ移動
						if(ev.which == 13) {
							if(ev.shiftKey) {
								active(_act.next);
								event.preventDefault();
							}
						}
					}
				});
				return this;
			});
		},
		/**
		 * @param _opt 自動補完に設定するパラメータ
		 * @param _dat $.Deferredオブジェクトで指定し、
		 *						 resolve|reject関数の引数に設定用データを返す
		 */
		setCompleteDescription : function(_opt,_dat,_ext,_top) {
			var
				alldata = false,
				top = (arguments.length < 4) ? true : _top,
				//自動補完パラメータ
				opt = $.extend({},{
					//デフォルト:先頭から一致を抽出
					source : function(q,s) {
						var
							_find,
							inp = q.term.replace(/\W/g,'\\$&').replace(/ /g,'_'),
							reg = (top) ? new RegExp('^'+inp,'mi') : new RegExp(inp,'mi'),
							sug = alldata;
						//データなし
						if(sug == undefined || !$.isArray(sug) || sug.length < 1) {
							return false;
						}
						_find = sug.filter(function(d) {
							return d.name.match(reg);
						});
						s($.map(_find,function(d) {
							return {
								label : d.name,
								value : d.name,
							};
						}));
					}
				},_opt),
				//データ設定[デフォルト:記事名称一覧]
				dat = (arguments.length < 2 || !$.isFunction(_dat)) ?
				 ((_dat == false || _dat == undefined) ? {} : 
					$.wikibok.requestCGI(
						'WikiBokJs::getDescriptionList',
						[],
						function(dat,stat,xhr) {return true;},
						function(xhr,stat,err) {return true;}
					).promise().done(function(res) {
						alldata = res;
					}))
				: _dat().promise().done(function(res) {
					alldata = res;
				}),
				ext = (arguments.length < 3 || _ext == undefined || _ext == null) ? false : $.extend({},{
					emptyItem : $.wikibok.wfMsg('wikibok-description','empty'),
					view : $('<div/>'),
					time : false,
					//表示要素へ記事内容を表示
					get : function(ui) {
						var p = this;
						ext.view.html('loading...');
						//連続イベントをある程度抑止
						if(ext.time !== false) {
							clearTimeout(ext.time);
						}
						ext.time = setTimeout(function() {
							//記事内容の取得$.Deferredオブジェクト
							$.wikibok.getDescriptionPage(ui)
							.done(function(d) {
								//取得に成功したので記事内容を書き換え
								var
									t = d['parse']['text']['*'],
									ht= $(t).html(),
									ot= $('<div/>').html(ht);
								if(ht == null) {
									ext.view.html(ext.emptyItem)
								}
								else {
									//リンクを停止...
									$(ot).find('a').removeAttr('title').removeAttr('href');
									ext.view.html($(ot).html());
								}
							})
							.fail(function(d) {
								//記事がない場合、規定文字へ
								ext.view.html(ext.emptyItem);
							});
						},500);
					}
				},_ext);
			return $.each(this,function() {
				var
					elem = $(this).autocomplete(opt),
					widget = elem.autocomplete('widget');
				if(ext !== false) {
					ext.view.addClass('wikibok ui-autocomplete description');
					//追加イベント定義
					elem
						.on('blur.wikibok',function(ev) {
							if(ext !== false) {
								ext.get.call(widget,$(ev.target).val());
							}
						})
						.on('autocompletefocus.wikibok',widget,function(ev,ui) {
							if(ext !== false) {
								ext.get.call(widget,ui.item.value);
							}
						});
				}
				return this;
			});
		},
		/**
		 * @param obj 検索対象のBokSVG-Object
		 *							- .allNodeメソッドで検索対象のデータをすべて取得できる(折り畳み済みノードも対象)
		 * @param set 検索イベントを呼び出すための要素を定義
		 *		find : 検索実行用要素
		 *		next : 検索結果(次)を選択
		 *		prev : 検索結果(前)を選択
		 *		list : 検索結果一覧を表示
		 *		text : 検索用文字列入力欄
		 */
		setSearch : function(obj,set) {
			var
				elem = this,
				opt = $.extend({},{
					find : '.commit',
					next : '.down',
					prev : '.up',
					list : '.list',
					text : '.text'
				},set),
				result = {
					act : -1,
					dat : null,
					txt : null,
				};
			/**
			 * 検索結果データの取得
			 * @param text 検索用文字列
			 * @param item 部分一致[True:あり/Fsalse:なし]
			 */
			function getData(text,item) {
				var
					txt = text.replace(/\W/g,'\\$&'),
					flg = (arguments.length < 2 || item == undefined) ? true : false,
					reg = new RegExp(((flg) ? txt : '^'+txt+'$'),'igm'),
					nodes = obj.allNode(),
					node = (text == '') ? nodes : nodes.filter(function(d) {
						return d.name.match(reg);
					});
				return {
					act : 0,
					dat : node,
					txt : text
				}
			}
			/**
			 * 検索結果番号から対象のノードを取得
			 */
			function active(act) {
				var
					o = this.dat[act],
					add = (arguments.length < 2 || b == undefined) ? false:b;
				if(o != undefined) {
					this.act = act;
					obj.actNode(o.name);
					//スクロール...
					$.scrollTo($('g[data="'+o.name+'"]'));
				}
				else {
					$.wikibok.timePopup(
						$.wikibok.wfMsg('wikibok-search','title')+' '+$.wikibok.wfMsg('common','error'),
						$.wikibok.wfMsg('wikibok-search','error','nodata'),
						5000
					);
				}
				return ;
			}
			/**
			 * 次の要素番号を取得(ループあり)
			 * @param act 現在の要素番号
			 */
			function _next(act) {
				act = act + 1;
				return (act < result.dat.length) ? act : 0;
			}
			/**
			 * 前の要素番号を取得(ループあり)
			 * @param act 現在の要素番号
			 */
			function _prev(act) {
				act = act - 1;
				return (act < 0) ? (result.dat.length - 1) : act;
			}
			//配下の各要素にイベントを設定
			$(elem)
				.on('click',opt.find,function() {
					result = getData($(elem).find(opt.text).val());
					//必ず検索結果先頭
					active.call(result,0);
				})
				.on('click',opt.next,function() {
					var txt = $(elem).find(opt.text).val();
					//検索文字列が同じ場合、次の要素
					if(result.txt == txt) {
						result.act = _next(result.act);
						active.call(result,result.act);
					}
					else {
						result = getData(txt);
						active.call(result,0);
					}
				})
				.on('click',opt.prev,function() {
					var txt = $(elem).find(opt.text).val();
					//検索文字列が同じ場合、前の要素
					if(result.txt == txt) {
						result.act = _prev(result.act);
						active.call(result,result.act);
					}
					else {
						result = getData(txt);
						active.call(result,0);
					}
				})
				.on('click',opt.list,function() {
					var
						txt = $(elem).find(opt.text).val() || '',
						res = getData(txt),
						dat = res.dat,
						toggle = false,
						open = true;
					if(dat.length > 0) {
						//検索結果一覧表の表示
						$.wikibok.exDialog(
								$.wikibok.wfMsg('wikibok-search','title'),
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
											//ダイアログ表示に検索文字列を設定
											dialog.dialog('widget').find('.ui-dialog-titlebar > span').html(function(d,e){
												return e+' ['+((res.txt == '') ? $.wikibok.wfMsg('wikibok-search','noinput'):res.txt)+']';
											});
											//データ更新
											_tbody.html(
												$.map(dat,function(d,i){
													if(d.name != '') {
														return '<tr class="data" num="'+i+'"><td>'+_escapeHTML(d.name)+'</td></tr>'
													}
												}).join('')
											);
											//DOMに検索結果一覧との紐付データを設定
											$.each(dat,function(i,d){
												if(d.name != '') {
													$('g[data="'+d.name+'"]').attr(dialog.get(0).id,true);
												}
											});
											//Clickイベント
											_tbody
											.off('click','tr.data')
											.on('click','tr.data',function(e) {
												var
													item = this,
													num = parseInt($(item).attr('num')) || 0,
													tName = $(item).html();
												dialog.find('tr').removeClass('act');
												$(item).addClass('act');
												active.call(res,num);
												//ダイアログを画面内に移動
												setTimeout(function(){
													dialog.dialog('option','position','center').dialog('moveToTop');
												},1);
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
											open = false;
										}
									},
									close : function() {
										var
											nodes = $('g['+this.id+']');
										//DOMに検索結果一覧との紐付データを削除
										nodes.removeAttr(this.id);
										//強調表示の解除
										nodes.find('polygon,text,circle').css({fill:''});
										obj.classed(dat[res.act],'active',false);
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
								txt
							);
						}
						else {
							//ノードなし
							$.wikibok.timePopup(
								$.wikibok.wfMsg('wikibok-search','title')+' '+$.wikibok.wfMsg('common','error'),
								$.wikibok.wfMsg('wikibok-search','error','nodata'),
								5000
							);
						}
				});
			//入力補完機能の設定
			$(this).find(opt.text).autocomplete({
				position : {
						my : 'left bottom',
						at : 'left top'
				},
				select : function(a,b) {
					//必ず選択した単語が検索結果となるようにする...
					result = getData(b.item.value,false);
					active.call(result,0);
					$(this).trigger('blur');
				},
				source : function(req,res) {
					var
						sug = $.map(obj.allNode(),function(d){return d.name}),
						inp = req.term.replace(/\W/g,'\\$&'),
						reg = new RegExp(inp,'mi');
					//データなし
					if(sug == undefined || !$.isArray(sug) || sug.length < 1) {
						return false;
					}
					//部分一致したノード群を返却
					res($.map(sug,function(d) {
						if(d.match(reg)) {
							return {
								label : d,
								value : d
							}
						}
					}));
				}
			})
			return $.each(this,function() {
				return this;
			});
		},
		/**
		 * テキスト編集エリア設定
		 * @param a 編集用テキストエリアのクラス名
		 * @param b 編集用アイコンのクラス名
		 */
		setTextEdit : function(a,b) {
			var
				area = $(this),
				text = (arguments.length < 1) ? '.wikibok-text' : _selecter(a),
				icon = (arguments.length < 2) ? '.wikibok-descriptioneditor-tooltip' : _selecter(b);
			/**
			 * テキストエリア内の選択範囲取得
			 * @param obj 対象テキストエリア
			 */
			function getAreaRange(obj) {
				var
					pos = new Object(),
					range,
					clone;
					if(document.selection != undefined) {
						//IE判定
						obj.focus();
						range = document.selection.createRange();
						clone = range.duplicate();
						//テキストコピー
						clone.moveToElementText(obj);
						clone.setEndPoint('EndToEnd',range);
						pos.start = clone.text.length - range.text.length;
						pos.end = clone.text.length - range.text.length + range.text.length;
					}
					else if(window.getSelection()) {
						pos.start = obj.selectionStart;
						pos.end = obj.selectionEnd;
					}
				return pos;
			}
			/**
			 * 文字列置換
			 * @param tar テキストエリア
			 * @param pre 選択範囲前の挿入文字
			 * @param pst 選択範囲後の挿入文字
			 * @param def 選択なしの場合の文字
			 */
			function wrap(tar,pre,pst,def) {
				var
					pos = getAreaRange(tar),
					val = tar.value,
					sel_text = val.slice(pos.start,pos.end),
					before_text = val.slice(0,pos.start),
					after_text = val.slice(pos.end),
					insert;
				//選択なし
				if(sel_text || pos.start != pos.end) {
					insert  = pre + sel_text + pst;
				}
				else if(pos.start == pos.end) {
					insert  = pre + def + pst;
				}
				tar.value = before_text+insert+after_text;
			}
			//クリックイベントがないため、mousedownへ設定
			area.find(icon)
			.on('mousedown','.wikibok_icon',function(){
				var
					target = area.find(text).get(0),
					item = $(this),
					tag_word = item.attr('tag') || false,
					pre_word,
					post_word,
					def_word = item.attr('sample') || '',
					namespace = item.attr('nsn') || '';
				if(tag_word == false) {
					pre_word = item.attr('pre') || '';
					post_word = item.attr('post') || '';
				}
				else {
					pre_word = '<'+tag_word+'>';
					post_word = '</'+tag_word+'>';
				}
				//ファイル選択ダイアログを表示
				if(namespace !== '') {
					_allImages().done(function(d) {
						var
							open = true,
							_page = '<div class="pager">'
									+ '<span class="icon16 first"></span>'
									+ '<span class="icon16 prev"></span>'
									+ '<input type="text" readonly="readonly" class="pagedisplay"/>'
									+ '<select class="pagesize">'
									+ '<option value="5">5</option>'
									+ '<option value="10">10</option>'
									+ '</select>'
									+ '<span class="icon16 next"></span>'
									+ '<span class="icon16 last"></span>'
									+ '</div>',
							tmp = '<div>'
									+ '<table class="imagefileslist">'
									+ '<thead><tr><th>'
									+ $.wikibok.wfMsg('wikibok-edittool','fileselect','link')+'</th><th>'
									+ $.wikibok.wfMsg('wikibok-edittool','fileselect','info')+'</th><th>'
									+ $.wikibok.wfMsg('wikibok-edittool','fileselect','name')+'</th></tr></thead>'
									+ '<tbody class="txt"></tbody>'
									+ '</table>'
									+ _page
									+ '</div>';
						if(d.length > 0) {
							$.wikibok.exDialog(
								$.wikibok.wfMsg('wikibok-edittool','fileselect','title'),
								tmp,
								{
									create : function() {
										$(this).find('.icon16').lineicon({width:'16px',height:'16px'});
									},
									focus : function() {
										var
											dialog = $(this),
											_table = dialog.find('table'),
											_pager = dialog.find('div.pager'),
											_tbody = dialog.find('tbody.txt')
										if(open) {
											open = false;
											_tbody.html(
												$.map(d,function(d) {
													return '<tr>' + 
														'<td><a href="'+d.dlink+'" target="_blank">'+$.wikibok.wfMsg('wikibok-edittool','fileselect','mark')+'</a></td>' +
														'<td><a href="'+d.plink+'" target="_blank">'+$.wikibok.wfMsg('wikibok-edittool','fileselect','mark')+'</a></td>' +
														'<td class="data">'+_escapeHTML(d.name)+'</td>'+
														'</tr>';
												}).join('')
											);
											//Clickイベント
											_tbody
												.off('click','td.data')
												.on('click','td.data',function(e) {
													//ファイル名称をクリックでリンクを挿入し、閉じる
													wrap(target,pre_word,post_word,namespace+':'+$(this).html());
													dialog.dialog('close');
												});
											//Sorter
											//イベント(その他)の2重登録対策
											_table.find('colgroup').remove();
											_table.find('thead th.header')
												.off('click')
												.off('mousedown')
												.off('selectstart');
											_pager.find('span').off('click');
											//データ一覧が表示状態でないと色分けが動かないのでここで初期化
											_table.tablesorter({
												widthFixed : true,
												widgets : ['zebra'],
												sortList : [[2,0]],
												headers : {
													0 : {sorter:false},
													1 : {sorter:false},
													2 : {sorter:'text'},
												}
											})
											.tablesorterPager({
												container : _pager,
												positionFixed : false,
												pagesize : 10
											});
										}
									}
								}
							);
						}
						else {
							//ノードなし
							$.wikibok.timePopup(
								$.wikibok.wfMsg('wikibok-edittool','fileselect','title')+' '+$.wikibok.wfMsg('common','error'),
								$.wikibok.wfMsg('wikibok-edittool','fileselect','error','nofile'),
								5000
							);
						}
					});
				}
				else {
					//通常のテキスト挿入のみ
					wrap(target,pre_word,post_word,def_word);
				}
			})
			.on('mouseup','.wikibok_icon',function(){
				//入力エリアへフォーカスを設定
				area.find(text).focus();
			});

		},
		/**
		 * 対象要素の色をHEX形式で取得
		 * @param a 取得する色の種別(CSS名称)[省略時:背景色]
		 */
		getHexColor : function(a) {
			var
				css = (arguments.length < 1 || a == undefined) ? 'backgroundColor' : a;
			function rgb2hex(rgb) {
				rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
				function hex(x) {
					return ("0" + parseInt(x).toString(16)).slice(-2);
				}
				return hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
			}
			return rgb2hex($(this).css(css));
		}
	});
//外部から参照されない関数はextendに記述しない
	/**
	 * ランダム文字列の作成
	 */
	var
		_unique = function(pre,len,rep) {
			var
				count = 0,
				maxLen = len || 5,
				maxCount = rep || 10,
				_id = '';
			do {
				var id = pre || '';
				//設定文字数分繰り返す
				for(var i=0;i<maxLen;i++) {
					//a～zの範囲のみ使用する[a-z]26文字/[a文字コード]97(0x61)
					id += String.fromCharCode((Math.random() * 26) + 97);
				}
				//DOM要素のIDを利用して重複チェック...
				_id = '#'+id;
				if($(_id).length == 0) {
					break;
				}
				count++;
			}
			//一定回数繰り返したら、取得できなくても抜ける
			while(count < maxCount);
			//取得できない場合、条件変更(文字数を+1)して再試行
			return ($(_id).length == 0) ? id : arguments.callee(pre,len+1,rep);
		},
		/**
		 * クラスセレクター文字列の補完
		 */
		_selecter = function() {
			var
				args = Array.prototype.slice.apply(arguments),
				a = args.shift(),
				b = args.shift() || '.';
			return (a == undefined) ? false : ((a.indexOf(b) < 0) ? b+a : a);
		},
		/**
		 * 2Way-Merge編集競合の内容をHTML化
		 * @param oDesc 旧記事内容
		 * @param nDesc 新記事内容
		 */
		_diffString = function(oDesc,nDesc) {
			//比較結果文字列の作成
			function out(o,n) {
				function sep(s) {
					var
						o = new Object();
					for(var i=0;i<s.length;i++) {
						if(o[s[i]] == null) {
							o[s[i]] = { rows : new Array(), diff : null };
						}
						o[s[i]].rows.push(i);
					}
					return o;
				}
				//両方の文字列を比較用に分割する
				var
					os = sep(o),
					ns = sep(n);

				for (var i in ns) {
					if(ns[i].rows.length == 1 && typeof(os[i]) != 'undefined' && os[i].rows.length == 1) {
						n[ns[i].rows[0]] = {text:n[ns[i].rows[0]],row:os[i].rows[0]};
						o[os[i].rows[0]] = {text:o[os[i].rows[0]],row:ns[i].rows[0]};
					}
				}
				//先頭から順に分割した位置の修正
				for (var i=0;i<(n.length - 1);i++) {
					if(n[i].text != null && n[i+1].text == null && (n[i].row + 1) < o.length 
					  && o[ n[i].row+1 ].text == null
					  && n[ i+1 ] == o[ n[i].row+1 ] ) {
						n[i+1] = { text: n[i+1], row: n[i].row + 1 };
						o[n[i].row+1] = { text: o[n[i].row+1], row: i + 1 };
					}
				}
				//終端から順に分割した位置の修正
				for ( var i = n.length - 1; i > 0; i-- ) {
					if ( n[i].text != null && n[i-1].text == null && n[i].row > 0 
					  && o[ n[i].row - 1 ].text == null 
					  && n[i-1] == o[ n[i].row - 1 ] ) {
						n[i-1] = { text: n[i-1], row: n[i].row - 1 };
						o[n[i].row-1] = { text: o[n[i].row-1], row: i - 1 };
					}
				}
				return { o: o, n: n };
			}
			//比較結果文字列のマークアップ
			function markup(o,n,c) {
				var
					res = '';
				for(var i=0;i<o.length;i++) {
					if(o[i].text != null) {
						res += _escapeHTML(o[i].text)+n[i];
					}
					else {
						res += '<span class="'+c+'">'+_escapeHTML(o[i])+n[i]+'</span>';
					}
				}
				return res;
			}
			var
				o = oDesc.replace(/\s+$/,''),
				n = nDesc.replace(/\s+$/,''),
				os = o.match(/\s+/g) || [],
				ns = n.match(/\s+/g) || [],
				out = out((o == '' ? [] : o.split(/\s+/)),(n == '' ? [] : n.split(/\s+/)));
			os.push('\n');
			ns.push('\n');
			return { o : markup(out.o,os,'ins') , n : markup(out.n,ns,'del')};
		},
		/**
		 * イメージファイルリストの取得
		 */
		_allImages = function () {
			var
				def = $.Deferred(),
				allimage = {};
			_func_image.call(def);
			return def.promise();

			/**
			 * 再帰呼出し用
			 */
			function _func_image(a) {
				var
					def = this,
					_pdata = $.extend({},{
						action : 'query',
						list : 'allimages',
						ainamespace : 6,
						aiprop : 'url',
						ailimit : 500
					},a);
				//リクエスト
				$.wikibok.requestAPI(
					_pdata,
					function(dat,stat,xhr) {
						if(dat['query'] != undefined && dat['query']['allimages'] != undefined) {
							var
								_name,
								_image,
								_images = dat['query']['allimages'];
							for(var k in _images) {
								_image = _images[k];
								_name = _image.name;
								if(_name != '' && allimage[_name] == undefined) {
									allimage[_name] = {
										name : _name,
										dlink: _image.url,
										plink: _image.descriptionurl,
									}
								}
							}
						}
						if(dat['query-continue'] == undefined) {
							//続きがないので終了
							def.resolve($.map(allimage,function(d){return d}));
						}
						else {
							//続きがあるので再帰呼出し
							_func_image.call(def,{aifrom:dat['query-continue']['allimages']['aifrom']});
						}
					},
					function(xhr,stat,err) {
						def.reject();
					}
				);
			}
		};

	/**
	 * HTML特殊文字のエスケープ
	 */
	function _escapeHTML(a) {
		return a.replace(/&/g,'&amp;')
				.replace(/"/g,'&quot;') //"
				.replace(/'/g,'&#039;') //'
				.replace(/</g,'&lt;')
				.replace(/>/g,'&gt;');
	}

})(jQuery);

