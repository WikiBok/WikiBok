/**
 * DescriptionEditor描画用Javascript関数群
 *	- (d3.v2.jsを利用)
 */
;(function($) {
	/**
	 * ドラッグ設定
	 */
	var node_drag = d3.behavior.drag()
		.on("dragstart", dragstart)
		.on("drag", dragmove)
		.on("dragend", dragend);
	/**
	 * ドラッグ開始
	 */
	function dragstart(d, i) {
		force.stop();
	}
	/**
	 * ドラッグ処理中
	 */
	function dragmove(d, i) {
		d.px += d3.event.dx;
		d.py += d3.event.dy;
		d.x += d3.event.dx;
		d.y += d3.event.dy; 
		//描画処理は共通
		_tick();
	}
	/**
	 * ドラッグ終了
	 */
	function dragend(d, i) {
		//一度確定した位置は自動計算で変更できないように設定
		d.fixed = true;
		_tick();
		force.resume();
	}
	/**
	 * 初回読み込み時に1度だけ設定するイベント
	 */
	function initial(func) {
		var	_nodes = d3.values(nodes),
			_count = $.wikibok.array_unique($.map(nodes,function(d){return d.name})).length,
			//ノード数に応じてサイズを設定
			// -- 3000ノードを超える場合、PDFダウンロードが使えない可能性があるので注意(倍率計算ではA4に縮小できないため?)
			_size = 400;
		//サイズ設定
		_size = (_count * Math.sqrt(options.linkDistance));
		_size = (_size < 1440) ? 1440 : ((_size > 14400) ? 14400 : _size);
		//キャンバスの設定開始
		force = d3.layout.force()
			.nodes(_nodes)
			.links(links)
			.gravity(options.gravity)
			.linkDistance(options.linkDistance)
			.charge(options.charge)
			//再計算イベントに描画イベントを設定
			.on('tick',_tick)
			.size([_size,_size]);
		svg = d3.select(options.owner.get(0)).append('svg:svg').attr('id','BokXml')
				.attr('width',_size+'px')
				.attr('height' , _size+'px')
				.attr('viewBox','0 0 '+parseInt(_size)+' '+parseInt(_size));
		//リンク矢印の形状を設定
		svg.append('defs').selectAll('marker')
			.data(
				//重複を排除
				$.wikibok.array_unique(
					//リンクデータから種別のみを抽出
					$.map(force.links(),function(d){return d.type;})
				)
			)
			//markerタグを設定
			.enter().append('marker')
			.attr('id', String)
			//表示領域を限定
			.attr('viewBox', '0 0 5 5')
			.attr('refX', 10)
			.attr('refY', 2.5)
			.attr('markerWidth', 5)
			.attr('markerHeight', 5)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,0L0,5L5,2.5L0,0');

		svg.append('svg:g').attr('id','path');
		svg.append('svg:g').attr('id','Description')
		svg.append('svg:g').attr('id','LinkText')
		svg.append('svg:g').attr('id','DescriptionText')

		//初期読み込み後にハッシュタグへスクロール
		update(func);
	}
	/**
	 * 再計算用のイベント
	 *  - 用途として、再計算時に発生する描画の変更を個別設定する
	 *    ※各要素のx/y設定についてはライブラリ内で解決積み(変更不可)
	 */
	function _tick(a,b) {
		//ロード完了orロード確認不要の場合TRUEになる
		var _load = $.data($('#wikibok-loading').get(0),'DescriptionLoad');
		if(_load == undefined || _load == false) {
		}
		else {
		//各要素の描画処理
			//紐付描画
			path.attr('d',function(d) {
				var	dx = d.target.x - d.source.x,
					dy = d.target.y - d.source.y,
					dr = Math.sqrt(dx * dx + dy * dy);
				return 'M'+d.source.x+','+d.source.y+' '+d.target.x+','+d.target.y;
			}).attr('name',function(d){
				return (d.linkName == '') ? null:d.linkName;
			});
			pathOther.attr('d',function(d) {
				var	dx = d.target.x - d.source.x,
					dy = d.target.y - d.source.y,
					dr = Math.sqrt(dx * dx + dy * dy);
				return	'M'+d.source.x+','+d.source.y+' '+d.target.x+','+d.target.y;
			}).attr('name',function(d){
				return (d.linkName == '') ? null:d.linkName;
			});
			//記事○位置
			desc.attr('transform',function(d){
				return 'translate('+d.x+','+d.y+')';
			});

			//記事テキスト位置
			descText.attr('transform',function(d){
				return 'translate('+d.x+','+d.y+')';
			});
			//SMWリンクの紐付の名称位置を設定
			smwLink.attr('transform', function(d) {
				return 'translate('+ (d.source.x) + ','+ (d.source.y)+ ')';
			});
			//SMWの名称が関連付けしているノードの間に来るように設定
			smwLinkText.attr('x',function(d) {
				return ((d.target.x - d.source.x) / 2);
			}).attr('y',function(d) {
				return ((d.target.y - d.source.y) / 2);
			});
			
		}
	}
	/**
	 * 記事に設定されているクラス及びデータタイプを変更する
	 * @param a 対象記事名称
	 * @param b 変更後データタイプ名称
	 */
	function changeDescriptionClass(a,b) {
		var	_target = d3.selectAll('circle','#Description').filter(function(d){return d.name == a}),
			_links = options.links;
		//設定されているデータタイプをクラスから削除
		for(var i = 0;i < _links.length; i++) {
			_target.classed(_links[i].type,false);
		}
		//変更後データタイプをクラスに追加する
		_target.classed(b,true);
		//実データタイプを変更
		nodes[a].type = b;
		return _target;
	}
	/**
	 * 更新処理
	 */
	function update(func) {
		//各要素を後で作成したものが重なった時に上に表示される
		//紐付要素
		path = d3.select('#path')
				.selectAll('path.edge')
				.data(force.links().filter(function(d){
					return (
						d.source.name != "" &&
						($.map(options.links,function(x) {
							return x.ltype;
						}).indexOf(d.type) == 0)
					);
				}));
		path.enter()
			.append('svg:path')
			.attr('id',function(d){return d.source.name+'->'+d.target.name})
			.attr('marker-end', function(d){ return 'url(#'+d.type+')';})
			.attr('class',function(d){return d.type + ' ' + d.linkName;})
			.classed('edge',true);
		path.exit().remove();

		pathOther = d3.select('#path')
				.selectAll('path.edge_other')
				.data(force.links().filter(function(d){
					return (
						d.source.name != "" &&
						($.map(options.links,function(x) {
							return x.ltype;
						}).indexOf(d.type) > 0)
					);
				}));
		pathOther.enter()
			.append('svg:path')
			.attr('id',function(d){return d.source.name+'->'+d.target.name})
			.attr('marker-end', function(d){ return 'url(#'+d.type+')';})
			.attr('class',function(d){return d.type + ' ' + d.linkName;})
			.classed('edge_other',true);
		pathOther.exit().remove();

		//記事(○の設定)
		desc = d3.select('#Description')
			.selectAll('g')
			.data(force.nodes());
		desc.enter()
			.append('svg:g')
			.append('svg:circle')
			.attr('r',6)
			.attr('data',function(d){return d.name;})
			.attr('class',function(d){return d.type;})
			.style('fill-opacity',function(d){
				return (DescriptionEditor.empty(d.name)) ? 0.2 : 1;
			});
		desc.transition()
			.attr('class',function(d){return d.type;})
			.style('fill-opacity',function(d){
				return (DescriptionEditor.empty(d.name)) ? 0.2 : 1;
			})
		desc.exit().remove();

		//SMW記事のリンク名称を設定
		smwLink = d3.select('#LinkText')
			.selectAll('g')
			.data(force.links().filter(function(d){return (d.linkName != '') }));
		var smwLinkEnter = smwLink.enter()
				.append('smw:g')
				.classed('link',true);
		smwLink.exit().remove();

		smwLinkEnter.append('svg:text').classed('shadow',true);
		smwLinkEnter.append('svg:text').classed('smw',true);
		smwLinkText = smwLink.selectAll('text')
			.text(function(d){return d.linkName;})
		//記事名称(dragイベントから除外するため別グループに作成)
		descText = d3.select('#DescriptionText')
			.selectAll('g')
			.data(force.nodes());
		descText.exit().remove();

		var descTextG = descText.enter()
			.append('svg:g')
			.attr('id',function(e){return e.name})
			.on('click',options.nodeClick)
			.classed('description',true);
		descTextG.append('svg:text')
			.attr('x', 8)
			.attr('y', '.31em')
			.attr('data',function(d){return d.name;})
			.attr('class', 'shadow')
			.text(function(e){return e.name;});
		descTextG.append('svg:text')
			.attr('x', 8)
			.attr('data',function(d){return d.name;})
			.attr('y', '.31em')
			.text(function(e){return e.name;});

		//計算処理開始
		force.alpha(.1);
		force.start();
		//初期配置時の描画を行う場合、設定を行う
		$.data($('#wikibok-loading').get(0),'DescriptionLoad',options.first_draw)
		var i = -1,
			m = options.first_tick_count,
			st = [];
		if(m > 0) {
			var	r = undefined;
				st.push(setTimeout(function(){
					if($(options.loading_element+':visible').length < 1) {
						$(options.loading_element).show();
					}
					++i;
					//1回分の座標計算を実施
					r = force.tick();
					if((i < m) && (r == undefined)) {
						//指定回もしくは収束するまで繰り返す([r = true]で疑似収束とする)
						st.push(setTimeout(arguments.callee,0));
					}
					else {
						setTimeout(function() {
							//計算処理終了
							force.stop();
							//タイマー停止
							for(var j=0;j<st.length;j++) {
								clearTimeout(st[j]);
							}
							//初期配置時の描画を行わない場合、ここで初期描画をする
							if(!options.first_draw) {
								setTimeout(function() {
									$.data($('#wikibok-loading').get(0),'DescriptionLoad',true)
									_tick();
								},0);
							}
							setTimeout(function() {
								//処理中の表示を終了
								$(options.loading_element).hide();
								//ドラッグイベントを設定
								desc.call(node_drag);
								//処理後に実行する関数
								if($.isFunction(func)) {
									func();
								}
							},0);
						},0);
					}
				},0));
		}
		//何もないところをクリックすると描画を止める...
		$('body,svg').bind('click',function(){
			force.stop();
		});
	}
	/**
	 * 記事用SVGElement追加
	 * @param a 記事内容[hash]
	 *  { name : 記事名称
	 *    type : 記事タイプ }
	 */
	function addNode(a) {
		var _node = $.extend({},{
				name : '',
				type : 'desc'
			},a);
		if(nodes[_node.name] == undefined) {
			nodes[_node.name] = _node;
		}
	}
	/**
	 * SMWリンク用SVGElement追加
	 * @param a リンクデータ[hash]
	 *  { source  : リンク元記事名称
	 *    target  : リンク先記事名称
	 *    type    : リンクタイプ
	 *    linkName: SMWタイプ名称 }
	 */
	function addLink(a) {
		var _link = $.extend({},{
				source : '',
				target : '',
				type : 'smw',
				linkName : ''
			},a),
			_links = links.filter(function(x) {
				return	(x.source.name == _link.source	&& 
						 x.target.name == _link.target	&& 
						 x.type == _link.type		&&
						 x.linkName == _link.linkName	);
			});
		//既存のリンクデータがない場合、リンクを作成
		if(_links.length <= 0) {
			//リンク先記事がない場合、記事Objを作成
			if(nodes[_link.target] == undefined) {
				nodes[_link.target] = {
					name : _link.target,
					type : 'desc'
				};
			}
			//リンク追加
			links.push({
				type : _link.type,
				linkName : _link.linkName,
				source : nodes[_link.source],
				target : nodes[_link.target]
			});
		}
	}
	/**
	 * SMWリンク用SVGElement削除
	 * @param a リンクデータ[hash]
	 *  { source  : リンク元記事名称
	 *    target  : リンク先記事名称
	 *    type    : リンクタイプ
	 *    linkName: SMWタイプ名称 }
	 */
	function delLink(a) {
		var	_link = $.extend({},{
				source : '',
				target : '',
				type : 'smw',
				linkName : ''
			},a),
			_links = links.filter(function(x) {
				return	(x.source.name == _link.source	&& 
						 x.target.name == _link.target	&& 
						 x.type == _link.type		&&
						 x.linkName == _link.linkName	);
			});
		//対象リンクがある場合
		for(var i=0;i<_links.length;i++) {
			//リンクのインデックスを取得
			var _del = links.indexOf(_links[i]);
			if(_del >= 0) {
				//見つかった場合、削除
				links.splice(_del,1);
			}
		}
	}
	var	DescriptionEditor = {
			'changeClass' : function(a,b){
				//データタイプを指定タイプに変更する
				return changeDescriptionClass(a,b);
			},
			'addNode' : addNode,
			'addLink' : addLink,
			'delLink' : delLink,
			'update' : function(a) {
				var	_target = d3.selectAll('circle','#Description').filter(function(d){return d.name == a});
				//データ再設定
				force.nodes(d3.values(nodes))
					.links(links);
				//再描画
				force.start();
				update();
				force.stop();
				//記事編集した場合、内容の有無によって塗りつぶしを変更
				// - nodes変数が変更にならないため、d3の追加/変更/削除イベントは発生しない...
				_target.style('fill-opacity',function(d){
					return (DescriptionEditor.empty(d.name)) ? 0.2 : 1;
				})
			},
			'nodes' : function() {
				return $.map(nodes,function(d,i){return i;});
			},
			'empty' : function(a) {
				//記事内容が空のデータを更新する
				var d = $.data($('#wikibok-loading').get(0),'DescriptionPages');
				if(d == undefined) {
					return true;
				}
				else {
					if(d[a] == undefined){
						return true;
					}
					else {
						return false;
					}
				}
			},
			'init' : function(a) {
				//初期設定
				options = $.extend({},defaults,a);
				options.owner = this;
				return DescriptionEditor;
			},
			'option' : function(a,b) {
				options[a] = b;
			},
			'options' : function(a) {
				options = $.extend(options,a);
			},
			'load' : function(a,b,c) {
				//サーバからデータ取得
				$.ajax({
					type : 'POST',
					dataType : 'json',
					url : options.cgi_uri,
					data : {
						action : 'ajax',
						rs : options.request_func,
						rsargs : [a,b]
					},
					success : function(r,rd) {
						desc = null;
						path = null;
						links = [];
						//Descriptionのみの記事データを設定
						//  -- 記事データなしの場合、空のObjectデータを作成する(Array型は不可)
						nodes = (r['node'].length < 1) ? {} : r['node'];
						//関連付け設定が有効なものを、リンクデータに設定
						for(var i=0;i<options.links.length; i++) {
							var	k = options.links[i].key,
								t = options.links[i].type,
								lt = options.links[i].ltype;
							//各要素を設定
							for(var j=0;j<r[k].length;j++) {
								var litem = r[k],
									d = litem[j];
								if(d.target == undefined || d.target == '') {
									//単独ノードの記事データ取りこぼしを防ぐ
									if(nodes[d.source] == undefined) {
										nodes[d.source] = {name : d.source,type:t};
									}
								}
								else {
									var _alink = {
											//記事が存在しない場合、ここで記事データを作成
											source : nodes[d.source] || (nodes[d.source] = {name : d.source,type:t}),
											target : nodes[d.target] || (nodes[d.target] = {name : d.target,type:t}),
											type : lt,
											linkName : d.linkName || ''
										},
										_dlinks = links.filter(function(x) {
											return	(x.source.name == _alink.source.name	&& 
													 x.target.name == _alink.target.name	&& 
													 x.linkName == _alink.linkName	);
										});
									//既存のリンクデータがない場合、追加
									if(_dlinks.length <= 0) {
										links.push(_alink);
									}
								}
							}
						}
						//初期読み込みでは、同期通信を行う...
						$.getDescriptionPages({},{},{async:false});
						initial(c);
					},
					error : function(r,rd) {
					},
					async : true,
					cache : false
				});
			}
		},
		options,
		defaults = {
			cgi_uri : wgServer + wgScriptPath + '/index.php',
			request_func : 'WikiBokJs::getDescriptionJson',
			gravity : 0.1,
			linkDistance : 60,
			charge : -300,
			nodeClick : function(a,b) {},
			edgeClick : function(a,b) {},
			//サーバ出力で得られるリンクの出力設定
			// key  :サーバから取得したリンクのキー値
			// type :上記データでBOKへ追加されていないノードに設定されるクラス名称
			// ltype:リンクに設定されるクラス名称
			links : [
				{key : 'boklink',type : 'bok' ,ltype : 'bok'},
				{key : 'smwlink',type : 'desc',ltype : 'smw'}
			],
			//初期出力時に表示するElementID
			// -- 描画しない場合には、本設定を行わないとBrowserが停止しているように見えるため注意が必要
			loading_element : '#wikibok-loading',
			//初回出力時に描画処理を指定回数で一時停止する
			// -- (0以下または527以上を設定した場合は、必ず収束まで終了しない)
			first_tick_count : 100,
			//初期出力時に描画処理を行う[TRUE]/行わない[FALSE]の設定
			// -- 描画をしないほうが若干だが処理時間を短縮できる
			first_draw : false
		},
		desc,
		descText,
		path,
		links,
		smwLink,
		smwLinkText,
		nodes,
		force;
	//jQueryオブジェクト拡張
	$.fn.extend({
		description : DescriptionEditor.init
	});
})(jQuery);
