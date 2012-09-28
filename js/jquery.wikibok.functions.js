;(function($) {
	$.extend({
		wikibok : new function() {
			var
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
			 * @param m 対象配列
			 */
			function array_unique(m) {
				var _chk = {},
					_res = [];
				if(arguments.length == 1) {
					for(var i=0;i<m.length;i++) {
						//チェック済み確認
						var k = m[i];
						if(!(k in _chk)) {
							_chk[k] = true;
							_res.push(k);
						}
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
				var arg = Array.prototype.slice.call(arguments),
					mes = meta_message,
					res = '';
				//パラメータ指定がない場合、空文字を返す
				if(arguments.length < 1) return '';
				if($.isArray(arg)) {
					for(var i=0;i<arg.length;i++) {
						var _res = mes[arg[i]];
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
					var _res = mes[arg];
					if((typeof _res == 'string') ||
						(typeof _res == 'number')) {
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
			 * @param a [省略可]ページ名称
			 */
			function getPageName(a) {
				var page = (arguments.length < 1) ? wgPageName : a;
				return page.slice(page.indexOf(':')+1);
			}
			/**
			 * 名前空間の取得
			 *	 - 省略時は表示中のページの名前空間を返す
			 *		 デフォルトはDescription用の名前空間
			 * @param a [省略可]検査対象のページ
			 * @param b [省略可]ページ名に名前空間を含まない場合の戻り値
			 */
			function getPageNamespace(a,b) {
				var ns = (arguments.length < 2) ? wgExtraNamespace[wgNsDesc] : b;
					page = (arguments.length < 1) ? wgPageName : a;
					idx =	 page.indexOf(':');
				return (idx < 0) ? ns : a.slice(0,idx);
			}
			/**
			 * 種別+項目名の2つでユニークIDを作成
			 * @param a 種別指定
			 * @param b 項目別指定
			 */
			function uniqueID(a,b) {
				var ids = $.wikibok.getTypeID(a,b),
					id = '';
				if(ids.length < 1) {
					//新規ID作成
					var ids = $.wikibok.getTypeID(a),
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
			 * @param a 種別指定
			 * @param b 項目別指定(省略可)
			 */
			function getTypeID(a,b) {
				var elem = $('body').get(0),
					ids = $.data(elem,a);
				return (arguments.length < 2)
				? ((ids == undefined) ? [] : ids)
				: ((ids == undefined) ? [] : ids.filter(function(d){return (d.name == b);}));
			}
			/**
			 * WikiBOKで統一したダイアログボックスを作成
			 */
			function exDialog(a,b,c,d) {
				var baseId = $.wikibok.uniqueID('dialog',a),
					copy = (arguments.length < 4 || d == undefined) ? false : true,
					id = (copy) ? $.wikibok.uniqueID(baseId,d) : baseId,
					mid = '#'+id,
					opt = $.extend({},{
						title : a,
						buttons : [
							{
								text : $.wikibok.wfMsg('common','button_close','text'),
								title: $.wikibok.wfMsg('common','button_close','title'),
								class: $.wikibok.wfMsg('common','button_close','class'),
								click: function() {
									$(this).dialog('close');
								}
							}
						],
						autoOpen : true,
						position : 'center'
					},c),
					baseCreate = function(e,ui) {
					}
				if($(mid).length == 0) {
					var content = $('<div></div>');
					//デフォルト設定[ID/Class]
					content.attr('id',id)
						.addClass('wikibok-exdialog')
						.addClass(a)
						.toggleClass('hide',true);
					$('body').append(content);
				}
				//ダイアログ作成
				$('body').on('dialogcreate',mid,function(){
					var
						pw = $(this).dialog('option','width'),
						ph = $(this).dialog('option','height'),
						cw,ch;
					$(this).prev().find('.ui-dialog-titlebar-close').hide();
					//追加コンテンツ
					if(typeof b == 'string') {
						content.html(b);
					}
					else if(typeof b == 'object'){
						//複数の場合cloneしないと移動する...
						var _add = (copy) ? b.clone(true) : b;
						content.append(_add);
						_add.show();
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
			 */
			function requestCGI() {
				var me = this,
					args = Array.prototype.slice.apply(arguments),
					rs = args.shift() || 'WikiBokJs::dummy',
					rsargs = args.shift() || [],
					sfunc = args.shift() || function(){return true;},
					efunc = args.shift() || function(){},
					argPlus = (arguments.length < 5) ? true : args.shift();
				//最新リビジョン+ユーザIDを自動付加する
				if(argPlus) {
					rsargs = $.merge([0,wgUserName],rsargs);
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

				//同期通信の場合ajaxStart/ajaxStopイベントが発生しないため...
				if(async == false) {
					$(me).trigger('ajaxStart');
				}
				//再帰呼出しが多いため、Deferredオブジェクトを返さない
				// -> 再帰呼出しごとに終了関数が呼ばれてしまうため予期した動きになり難い
				return $.ajax({
					type : 'POST',
					dataType : 'JSON',
					url : wgServer+wgScriptPath+'/api.php',
					data : postData,
					success : function(dat,stat,xhr) {
						sfunc.apply(me,arguments);
						if(async == false) {
							$(me).trigger('ajaxStop');
						}
					},
					error : function(xhr,stat,et) {
						efunc.apply(me,arguments);
						if(async == false) {
							$(me).trigger('ajaxStop');
						}
					},
					async : async,
					cache : false,
				});
			}
			/**
			 * 記事一覧を取得する
			 * @param next 一覧取得開始名称[省略時:先頭から]
			 * @param one	 単一記事のみ取得する/しない[省略時:複数取得]
			 */
			function _description(next,one) {
				var
					def = this,
					_one = (arguments.length < 2) ? false : one,
					_pdata = $.extend({},{
						action : 'query',
						generator : 'allpages',
						gapnamespace : wgNsDesc,
						prop : 'info',
						gaplimit : ((_one === true) ? 1 : 500)
					},{
						gapfrom : ((arguments.length < 1) ? '' : next)
					});
				//リクエスト
				$.wikibok.requestAPI(
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
									ns : page.ns
								}
							}
						}
						//記事1件のみの場合、再帰する必要なし
						if(_one) {
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
			 * サーバから全件取得
			 */
			function loadDescriptionPages() {
				var def = $.Deferred();
				_description.call(def);
				return def.promise();
			}
			/**
			 * 記事一覧を名称で検索
			 * @param a 記事名称
			 * @param b 部分一致検索ON/OFF [省略時ON]
			 * @param c 空白記事かどうかをチェックする(空白でないもののみ返す)/しない [省略時OFF]
			 */
			function findDescriptionPage(a,b,c) {
				var
					inp = a.replace(/\W/g,'\\$&'),
					reg = new RegExp((arguments.length < 2) ? inp : ((!b) ? ('^'+inp+'$') : inp)),
					pagesize = (arguments.length < 3) ? 0 : ((c == true) ? 1 : 0);
				return $.map(description_pages,function(d) {
					if(d.name.match(reg)) {
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
						titles : getPageNamespace(_page)+':'+getPageName(_page),
					};
				$.wikibok.requestAPI(
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
			/**
			 * 記事1件分を取得
			 * @param a 記事名称
			 * @param prop 取得内容(Wiki-APIに準拠)
			 */
			function getDescriptionPage(_page,_prop) {
				var
					def = $.Deferred(),
					//デフォルトに追加
					prop = array_unique($.merge([
						'text',
						'displaytitle',
						'revid',
					],_prop)),
					_pdata = $.extend({},{
						action : 'parse',
						prop : prop.join('|'),
					//タイトル＋テキストを指定して仮登録
					//	title : '',
					//	text : '',
					//もしくは、「page」に登録済みページ名を指定してデータ取得...のどちらかができる(?)
						page : getPageNamespace(_page)+':'+getPageName(_page),
					});
				$.wikibok.requestAPI(
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
			 * @param a パラメータ名称[省略時:全パラメータ]/[#:ネーム]
			 */
			function getUrlVars(a) {
				var
					_href = window.location.href,
					_query = _href.slice(_href.indexOf('?')+1,_href.indexOf('#')),
					hashes = _query.split('&'),
					names = _href.slice(_href.indexOf('#') + 1),
					vars = [];
				//省略時
				if(arguments.length<1||a==undefined||a=='') {
					for(var i=0;i<hashes.length;i++) {
						var
							hash = hashes[i].split('='),
							dhash1 = decodeURI(hash[0]),
							dhash2 = (hash[1] == undefined) ? true : decodeURI(hash[1]);
						vars.push({
							name : dhash1,
							value: dhash2
						});
					}
				}
				else {
					//名称
					if(a == '#') {
						vars = names;
					}
					else {
						for(var i=0;i<hashes.length;i++) {
							var
								hash = hashes[i].split('='),
								dhash1 = decodeURI(hash[0]),
								dhash2 = (hash[1] == undefined) ? true : decodeURI(hash[1]);
							//指定パラメータのみ
							if(dhash1 == a) {
								vars = {
									name : dhash1,
									value: dhash2
								};
							}
						}
					}
				}
				return vars;
			}
			/**
			 * 記事参照ダイアログ
			 * @param a 表示記事名称
			 * @param b 表示記事内容
			 * @param c パラメータ
			 */
			function viewDescriptionDialog(a,b,c) {
				var
					_open = true,
					_btn = [],
					_mode = (arguments.length < 3 || c == undefined) ? 'view' : c,
					_edit = {
						text : $.wikibok.wfMsg('common','button_edit','text'),
						title: $.wikibok.wfMsg('common','button_edit','title'),
						class: $.wikibok.wfMsg('common','button_edit','class'),
						click: function() {
							$(this).dialog('close');
							$.wikibok.getDescriptionEdit(a)
							.done(function(dat) {
								var
									_title = getPageNamespace(a)+':'+getPageName(a),
									page = dat.query.pages,
									edesc = $.map(page,function(d) {
										return (d.revisions) ? $.map(d.revisions,function(d) {
											return d['*'];
										}).join() : '';
									}).join(),
									token = $.map(page,function(d) {return d.edittoken;}).join(),
									timestamp = $.map(page,function(d) {return d.starttimestamp;}).join();
								//編集結果をAPIで反映してから,BOK-XMLへ反映する/しない
								$.wikibok.editDescriptionDialog(a,edesc,{
									title : _title,
									token : token,
									basetimestamp : timestamp,
								})
							});
						}
					},
					_make = {
						text : $.wikibok.wfMsg('wikibok-new-element','bok','button_create','text'),
						title: $.wikibok.wfMsg('wikibok-new-element','bok','button_create','title'),
						class: $.wikibok.wfMsg('wikibok-new-element','bok','button_create','class'),
						click: function() {
							$(this).dialog('close');
							alert('ノード追加');
						}
					},
					_close = {
						text : $.wikibok.wfMsg('common','button_cancel','text'),
						title: $.wikibok.wfMsg('common','button_cancel','title'),
						class: $.wikibok.wfMsg('common','button_cancel','class'),
						click: function() {
							$(this).dialog('close');
						}
					}
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
				$.wikibok.exDialog(
					$.wikibok.wfMsg('wikibok-edittool','view','title'),
					$('#wikibok-description-view'),
					{
						buttons:_btn,
						focus : function() {
							if(_open) {
								$(this).find('.title').html(a);
								$(this).find('.wikibok-text').html(b);
								_open = false;
							}
						}
					},
					a
				);
			}
			/**
			 * @param a 記事名称
			 * @param b 記事内容
			 * @param c EditTokenを含むその他オプション情報(ハッシュ)
			 */
			function setWikiPage(a,b,c) {
				var
					_title = getPageNamespace(a)+':'+getPageName(a),
					_body = b,
					_pdata = $.extend({},{
						action : 'edit',
						summary: 'edit',
						title : _title,
						text : _body,
					},c),
					def = $.Deferred();
				$.wikibok.requestAPI(
					_pdata,
					function(dat,stat,xhr) {
						if(dat.error != undefined) {
							if(dat.error.code == 'editconflict') {
								//編集競合発生
								$.wikibok.getDescriptionEdit(_title)
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
									$.wikibok.editDescriptionDialog(a,edesc,{
										title : _title,
										token : token,
										basetimestamp : timestamp,
									},_diffString(_body,edesc));
									def.resolve(false);
								})
							}
							else {
								def.reject();
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

				$.wikibok.exDialog(
					$.wikibok.wfMsg('wikibok-edittool','edit','title'),
					$('#wikibok-description-edit'),
					{
						create : function() {
							$(this).setTextEdit();
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
							text : $.wikibok.wfMsg('wikibok-edittool','button_commit','text'),
							title: $.wikibok.wfMsg('wikibok-edittool','button_commit','title'),
							class: $.wikibok.wfMsg('wikibok-edittool','button_commit','class'),
							click: function() {
								var
									me = this,
									_inTitle = $(this).find('.title').val(),
									_inBody = $(this).find('.wikibok-text').val();
								setWikiPage(_inTitle,_inBody,_pst)
								.done(function(dat) {
									if(dat) {
										//登録成功
										$(me).dialog('close');
									}
									//正常終了時の引数判定で後続処理を記述する(EditConflictはFALSE扱い...)
									myDef.resolve(dat);
								})
								.fail(function(dat,diff) {
									//登録失敗
									myDef.resolve(false);
								});
							}
						},{
							text : $.wikibok.wfMsg('common','button_close','text'),
							title: $.wikibok.wfMsg('common','button_close','title'),
							class: $.wikibok.wfMsg('common','button_close','class'),
							click: function() {
								$(this).dialog('close');
								def.reject();
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
			 */
			function timePopup(a,b,c) {
				$.wikibok.exDialog(
					a,
					b,{
					open : function() {
						var
							me = this,
							t = setTimeout(function() {
								$(me).dialog('close');
							},c);
						$(me).html(b);
						$.data($(me).get(0),'timer',t);
					},
					close : function() {
						var
							t = $.data($(this).get(0),'timer');
						if(t != null) {
							clearTimeout(t);
						}
					}
				});
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
				getDescriptionEdit : getDescriptionEdit,
				getUrlVars : getUrlVars,
				viewDescriptionDialog : viewDescriptionDialog,
				editDescriptionDialog : editDescriptionDialog,
				timePopup : timePopup,
			};
		},
		/**
		 * リビジョン番号関連オブジェクト
		 */
		revision : (function(){
			var me = {},
				isReady = false,
				isRequest = false;
			/**
			 * 格納済みデータから対象項目を取得
			 * @param 対象項目[省略時:リビジョンデータ全体を取得]
			 */
			function _get(a) {
				var dat = {
						base : 0,
						head : 0,
						user : 0
					},
					read = null;
				//DOM要素の準備完了
				if(isReady) {
					read = $.data(me.get(0),'revision');
					if(read !== undefined) {
						dat = read;
					}
				}
				return (arguments.length < 1 || a == undefined) ? dat : dat[a];
			}
			/**
			 * サーバからリビジョンデータを取得
			 *   - レスポンスデータは常に最新情報を取得する前提
			 */
			function _request() {
				//DOM要素の準備完了
				if(isReady) {
					//二重リクエスト制御
					if(isRequest === false) {
						isRequest = true;
						$.wikibok.requestCGI(
							'WikiBokJs::getBokRevision',
							[wgUserName],
							function(dat,stat,xhr) {
								//DOMデータに格納
								$.data(me.get(0),'revision',dat);
								$.data(me.get(0),'base',dat.base);
								$.data(me.get(0),'head',dat.head);
								_setRev(dat.user);
								_editTree(dat.edit);
							},
							function(xhr,stat,err) {},
							false
						)
						.always(function() {isRequest = false;});
					}
				}
			}
			/**
			 * 編集中リビジョン番号の設定
			 * @param user リビジョン番号[省略時:前回リクエストUserリビジョン]
			 */
			function _setRev() {
				var user = _getRev();
				if(isReady) {
					if(arguments.length > 0) {
						user = arguments[0];
						dat = _get();
						dat.user = user;
						$.data(me.get(0),'revision',dat);
					}
					$.data(me.get(0),'user',user);
					_updateHTML();
				}
			}
			/**
			 * 編集中リビジョン番号の取得
			 */
			function _getRev() {
				//DOM要素に設定済みのUserリビジョン[Or 0]を取得
				return (isReady) ? $.data(me.get(0),'user') || 0 : 0;
			}
			/**
			 * ツリー構造への編集有無を設定/取得
			 *   - 編集[UNDO/REDO]及びツリー折畳などでツリー表示の自動更新を停止するために使用
			 * @param edit 編集状況[True:あり/False:なし]
			 *             [省略時]現在設定値の取得のみ
			 */
			function _editTree() {
				var res = false;
				if(isReady) {
					if(arguments.length > 0) {
						$.data(me.get(0),'edit',arguments[0]);
					}
					res = $.data(me.get(0),'edit');
				}
				return res;
			}
			/**
			 * リビジョン番号の表示更新
			 */
			function _updateHTML() {
				var dat = _get(),
					_user = parseInt(dat.user) - parseInt(dat.base);
				if(isReady) {
					me.find('.base').html(dat.base);
					me.find('.head').html(dat.head);
					me.find('.edit').html(_user);
				}
			}
			/**
			 * オブジェクトの初期処理
			 */
			function construct() {
				//DOMオブジェクトの設定
				if(arguments.length > 0) {
					me = $(arguments[0]);
					isReady = true;
				}
				else {
					me = $(this);
					isReady = (me.length > 0);
				}
				//サーバリクエスト+HTML更新
				_sync();
			}
			/**
			 * サーバリクエストを行いその結果をHTMLへ出力
			 */
			function _sync() {
				_request();
				me.one('ajaxStop', _updateHTML);
			}
			//オブジェクトで利用するメソッド定義
			return {
				construct : construct,
				request : _request,
				setRev : _setRev,
				getRev : _getRev,
				editTree : _editTree,
				updateHTML : _updateHTML,
				sync : _sync
			}
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
						if(arguments.length > 1|| first) {
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
		}())
	});

	$.fn.extend({
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
				x : 20,
				y : 20,
				slideSpeed : 'fast'
			},a);
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
						$(this).css({
							top : y,
							left : x
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
							inp = q.term.replace(/\W/g,'\\$&'),
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
							$.wikibok.getDescriptionPage(ui,[])
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
					o = this.dat[act];
				this.act = act;
				obj.actNode(o.name);
				//スクロール...
				$.scrollTo($('g[data="'+o.name+'"]'));
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
						_focus = true;
					$('#wikibok-searchresult').find('tbody.txt').html(
						$.map(dat,function(d){
							if(d.name != '') {
								return '<tr class="data"><td>'+_escapeHTML(d.name)+'</td></tr>'
							}
						}).join()
					);
					$.wikibok.exDialog(
							$.wikibok.wfMsg('wikibok-search','title'),
							$('#wikibok-searchresult'),
							{
								create : function() {
									var
										dialog = $(this),
										_color = dialog.find('.color'),
										_colorPicker = dialog.find('.colorPicker'),
										_colorSelect = dialog.find('.colorSelect'),
										_colorDiv = dialog.find('.colorSelect').find('div'),
										tmp;
									_colorPicker.ColorPicker({
										flat : true,
										onSubmit:function(hsb,hex,rgb,elem) {
											_colorDiv.css({backgroundColor : '#'+hex});
											_colorPicker.stop().animate({height:0},500);
											_color.val(hex);
											_colorSelect.trigger('click');
										}
									});
									_colorSelect.toggle(
										function() {_colorPicker.stop.animate({height:173},500);},
										function() {_colorPicker.stop.animate({height:  0},500);}
									);
								},
								focus : function() {
									if(_focus) {
										$(this).html($('#wikibok-searchresult').html());
									}
								}
							},
							txt
						);
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
		setTextEdit : function(a,b) {
			var
				area = $(this),
				text = (arguments.length < 1) ? '.wikibok-text' : _selecter(a),
				icon = (arguments.length < 2) ? '.wikibok-descriptioneditor-tooltip' : _selecter(b);
			/**
			 * テキストエリア内の選択範囲取得
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
			area.find(icon).on('mousedown','.wikibok_icon',function(){
				var
					target = area.find(text).get(0),
					item = $(this),
					pre_word = item.attr('pre') || '',
					post_word = item.attr('post') || '',
					def_word = item.attr('sample') || '',
					namespace = item.attr('nsn') || '';
				if(namespace !== '') {
					alert('参考表示')
				}
				wrap(target,pre_word,post_word,def_word)
			});

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
	_selecter = function() {
			var
				args = Array.prototype.slice.apply(arguments),
				a = args.shift(),
				b = args.shift() || '.';
			return (a == undefined) ? false : ((a.indexOf(b) < 0) ? b+a : a);
			
		},
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
	_escapeHTML = function(a) {
			return a.replace(/&/g,'&amp;')
					.replace(/"/g,'&quot;') //"
					.replace(/'/g,'&#039;') //'
					.replace(/</g,'&lt;')
					.replace(/>/g,'&gt;');
		}
})(jQuery);

