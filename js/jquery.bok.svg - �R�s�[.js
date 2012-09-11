/**
 * BokEditor描画用Javascript関数群
 *  - (d3.v2.jsの拡張ライブラリ)
 */
;(function($) {
	/**
	 * アイテム(▷)用座標指定
	 * @param r 半径
	 */
	function triange(r) {
		var  x = r / Math.sqrt(3),
			_x = x * (-1),
			 y = x * 2,
			_y = y * (-1);
		return	_x+','+_y+' '+r+','+ 0+' '+_x+','+ y;
	}
	/**
	 * アイテム(□)用座標指定
	 * @param r 半径
	 */
	function rect(r) {
		var l = Math.sqrt(2) * r / 2,
			_l = l * (-1);
		return	_l+','+_l+' '+l+','+_l+' '+l+','+ l+' '+_l+','+ l+' '+_l+','+_l+' ';
	}
	/**
	 * SVGキャンパスのデータ更新
	 * @param	source	更新対象の先頭ノードデータ(配下のノードは自動更新)
	 */
	function update(source) {
		//BOKノードの数に応じてキャンバスサイズを変更
		changeSize(getSize(root));
		var diagonal = d3.svg.diagonal()
			.projection(function(d) {
				//x:y軸を交換(横向き)かつサイズ未設定時のエラー回避
				return (d.x == undefined || d.y == undefined) ? [0,0] : [d.y, d.x];
			});
		//ノードレイアウトの値を計算
		var nodes = tree.nodes(root).reverse();
		//x軸方向をノードの深さに比例した位置に固定する
		nodes.forEach(function(d) {
			d.y = (d.depth - 1) * options.node.w + d.depth * 5;
		});

		//疑似TOPノードは不要なので深さを元にデータから排除
		var	myNodes = nodes.filter(function(d) {return d.depth > 0;});
			myLinks = tree.links(nodes).filter(function(d) {return d.source.depth > 0;});

		//ノードデータ定義
		var node = vis.selectAll('g.node')
			.data(myNodes,function(d) { return d.id || (d.id = ++i); });

		//ノード追加時の処理
		var nodeEnter = node.enter().append('svg:g')
			.attr('id', function(d) { return d.name;})
			.attr('transform', function(d) { return 'translate(' + source.y0 + ',' + source.x0 + ')'; })
			.classed('node',true);

		//折り畳み用Element
		nodeEnter.append('svg:polygon')
			.attr('points',function(d){
				var r = d.r || 4.5;
				return (d.children ? rect(r) : ((d._children) ? triange(r) : rect(r)));
			})
			.on('click', function(d) {
				//トグル動作
				if (d.children) {
					d._children = d.children;
					d.children = null;
				} else {
					d.children = d._children;
					d._children = null;
				}
				options.symbolClick();
				//配下のノードを更新
				update(d);
			});
		//ノード名称
		nodeEnter.append('svg:text')
			.attr('x', 8)
			.attr('y', 3)
			.attr('data',function(d){return d.name;})
			.on('click',function(d) {
				//クリックイベントはオプションで変更可能
				options.nodeClick(d.name);
			})
			.text(function(d) { return d.name; });
		//追加ノードを配置
		nodeEnter.transition()
			.duration(options.duration)
			.attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; })
			.style('opacity', 1)
		.selectAll('polygon')
			.attr('points',function(d){
				var r = d.r || 4.5;
				return (d.children ? rect(r) : ((d._children) ? triange(r) : rect(r)));
			})
			.style('fill-opacity',function(d){
				return (BokEditor.empty(d.name)) ? 0.2 : 1;
			});

		//再描画(再配置)
		node.transition()
			.duration(options.duration)
			.attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; })
			.style('opacity', 1)
		.selectAll('polygon')
			.attr('data',function(d){return d.name;})
			.attr('points',function(d){
				var r = d.r || 4.5;
				return (d.children ? rect(r) : ((d._children) ? triange(r) : rect(r)));
			})
			.style('fill-opacity',function(d){
				return (BokEditor.empty(d.name)) ? 0.2 : 1;
			});
		//削除
		node.exit().transition()
			.duration(options.duration)
			.attr('transform', function(d) { return 'translate(' + source.y + ',' + source.x + ')'; })
			.style('opacity', 1e-6)
			.remove();

		//エッジ作成
		var link = vis.selectAll('path.link')
			.data(myLinks,function(d){ return d.target.id; });

		link.enter().insert('svg:path', 'g')
			.attr('class', 'link')
			.attr('d', function(d) {
				var o = {x: source.x0, y: source.y0};
				return diagonal({source: o, target: o});
			})
			.on('click',function(d) {
				//クリックイベントはオプションで変更可能
				options.edgeClick(d.target.name);
			})
			.text(function(d) { return d.name; })
			.transition()
			.duration(options.duration)
			.attr('d', diagonal);
		//再配置
		link.transition()
			.duration(options.duration)
			.attr('d', diagonal);
		//エッジデータ削除処理
		link.exit().transition()
			.duration(options.duration)
			.attr('d', function(d) {
				var o = {x: source.x, y: source.y};
				return diagonal({source: o, target: o});
			})
			.remove();

		//折り畳み状態をクラスに反映
		d3.selectAll('polygon')
			.classed('bok',true);

		//再配置済みデータを旧配置データとして設定
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
		return true;
	}
	/**
	 * 描画初期処理
	 *  - キャンパスを作成
	 */
	function initial() {
		//D3ライブラリのツリー表示を呼び出し
		tree = d3.layout.tree();
		svg = d3.select(options.owner.get(0)).append('svg:svg').attr('id','BokXml');
		vis = svg.append('svg:g').attr('transform','translate(10,16)');
	}
	/**
	 * BOK-XMLデータをd3.jsのtree描画用に変換(再帰呼出あり)
	 */
	function _convert() {
		var	me = $(this),
			cs=[];
		//呼出元タグの子要素に対してすべて実施
		$.each(me,function(a,b) {
			var	n = $(b).find('>name').text(),
				c = $(b).find('>nodes'),
				_cs = null;
			if(c.length > 0) {
			//[NODES]タグありの場合、[NODES]タグ内の[NODE]ごとに再帰呼出
				_cs = _convert.call($(c).find('>node'))
			}
			//自分の名称と子ノードを合わせてデータとする
			cs.push({
				name  : n,
				children: _cs
			});
		});
		return cs;
	}
	/**
	 * SVGキャンバス内にノードを描画する
	 *  - サーバで保持しているBOK-XMLデータの変更は行われないことに注意
	 * @param	a	追加ノード名
	 * @param	b	追加対象ノード(省略時はTOPノードに追加)
	 */
	function addNode(a,b) {
		var p = (arguments.length < 2 || b == undefined || b == '') ?
				root :
				AllNodes.filter(function(d){return d.name == b})[0],
			_focus;
		//描画終了時でのイベント設定が難しいため、追加対象先のノードへフォーカスする
		if(p.children == null && p._children == null) {
			_focus = p.name;
			p.children = [{
				name : a,
				children : null
			}];
		}
		else {
			var addTarget = p.children || p._children;
			_focus = (addTarget.length < 1) ? p.name : addTarget[addTarget.length-1].name;
			addTarget.push({
				name : a,
				children : null
			});
		}
		//更新...
		AllNodes = tree.nodes(root);
		update(root);
		//フォーカスノードへのスクロールは戻り先で実施
		return _focus;
	}
	/**
	 * ノード移動
	 * @param a 移動させるノード名称
	 * @param b 移動先のノード名称
	 */
	function moveNode(a,b) {
		var cn = AllNodes.filter(function(d){return d.name == a;})[0],
			pn = (arguments.length < 2) ?
				root :
				AllNodes.filter(function(d){return d.name == b})[0],
			pc = cn.parent.children || cn.parent._children;
		if(pn.children == null && pn._children == null) {
			pn.children = [];
		}
		var addTarget =  pn.children || pn._children,
			_focus = ((pn.children || pn._children).length == 0) ? pn.name : addTarget[addTarget.length-1].name;
		addTarget.push(cn);
		//移動元からノードを削除
		var	di = $.inArray(cn.name,$.map(pc,function(d) {return d.name}));
		pc.splice(di,1);
		if(pc.length < 1) {
			//最後の1個の場合、データを初期化
			pc = null;
		}
		//スクロール用に自身の配下を畳む
		if(cn.children != null && cn.children.length > 0) {
			cn._children = cn.children;
			cn.children = null;
		}
		update(root);
		//フォーカスノードへのスクロールは戻り先で実施
		return _focus;
	}
	/**
	 * ノード削除
	 * @param a 削除対象ノード名称
	 * @param b 配下のノードの扱い(TRUE:削除/FALSE:削除しない[上位ノードへ付け替え])
	 */
	function delNode(a,b) {
		var cn = AllNodes.filter(function(d){return d.name == a;})[0],
			p = cn.parent,
			cc = (cn.children == null) ? ((cn._children == null) ? false : cn._children) : cn.children;
		//子ノードがない場合、移動の必要なし
		if(cc == false) {
		}
		else {
			//自分の子ノードを上位ノードに移動する
			if(!b && cc.length > 0) {
				//移動中に要素数が減少していくため、要素番号の大きい方から付け替え...
				var _i = cc.length;
				while(--_i >= 0) {
					moveNode(cc[_i].name,p.name);
				}
			}
		}
		//ノードを削除(付け替え終了後に要素番号を取得)
		var di = $.inArray(cn.name,$.map(p.children,function(d) {return d.name}));
		if(di >= 0) {
			p.children.splice(di,1);
		}
		if(p.children.length < 1) {
			//最後の1個の場合、データを初期化
			p.children = null;
		}
		update(root);
		//フォーカスノードへのスクロールは戻り先で実施
		return p.name;
	}
	/**
	 * SVG描画キャンバス用データのサイズ変更およびHTML表示用領域の拡張
	 * @param	_size	[Array] y/xの配列
	 */
	function changeSize(_size) {
		var	w = _size[1] + options.node.w,
			h = _size[0] + options.node.h,
			view = '0 0 '+w+' '+h;
		tree.size(_size);
		svg.attr('width',w)
			.attr('height',h)
			.attr('viewBox',view);
	}
	/**
	 * データ表示に必要なキャンパスサイズの取得
	 */
	function getSize(root) {
		var ns = tree.nodes(root),
			xs = $.unique($.map(ns,function(d){return d.x})).sort(),
			w  = (Math.max.apply({},$.map(ns,function(d){return d.depth})) || 1),
			//縦は
			size = ($.isArray(xs))
				 ? [ ((xs.length + 1) * options.node.h) , (w  * options.node.w)]
				 : [ (2 * options.node.h) , (w * options.node.w)];
		//小数点以下丸め
		return $.map(size,function(d){return Math.round(d)});
	}
	/**
	 * xmlデータからjs用変数へデータ変換
	 * @param xml xml文字列
	 */
	function xml2js(xml) {
		_root = _convert.call($(xml));
		root = _root[0];
		//折り畳み中のノードからデータが取得できないため、すべて表示しているload段階でノードのデータを退避
		AllNodes = tree.nodes(root);
		return update(root);
	}
	/**
	 * BOKEditorオブジェクト
	 */
	var BokEditor = {
		'addNode' : addNode,
		'moveNode' : moveNode,
		'delNode' : delNode,
		'delNode' : delNode,
		'nodes' : function() {
			return (root == undefined) ? null : $.map(AllNodes,function(d){return d.name;});
		},
		'empty' : function(a) {
			//記事が空でないものを抽出済み
			var d = $.data($('#wikibok-loading').get(0),'DescriptionPages');
			//そもそも記事がない場合
			if(d == undefined) {
				return true;
			}
			else {
				//対象の記事がない場合、空記事として出力
				if(d[a] == undefined){
					return true;
				}
				else {
					return false;
				}
			}
		},
		'actNode' : function(a) {
			//ノード名称からノードObjectを取得する
			var	target = AllNodes.filter(function(d){return d.name == a})[0],
				dfd = $.Deferred();
			if(!(target == undefined || target.length < 1)) {
				//時間
				setTimeout(function() {
					//無名関数-呼び出し
					(function(){
						var p = this.parent;
						if(p != undefined) {
							var	c = p.children,
								_c = p._children;
							if((c == null) && (_c != null)) {
								p.children = _c;
								p._children = null;
							}
							//再帰
							arguments.callee.call(p);
						}
					}).call(target);
					//再描画
					if(update(root)) {
						dfd.resolve(target);
					}
					else {
						dfd.reject();
					}
				},0);
			}
			return dfd.promise();
		},
		'init' : function(option) {
			options = $.extend({},defaults,option);
			options.owner = this;
			initial();
			return BokEditor;
		},
		'option' : function(a,b) {
			options[a] = b;
		},
		'options' : function(a) {
			options = $.extend(options,a);
		},
		'update' : update,
		'load' : function(r,u,sf) {
			var me = this;
			$.ajax({
				type    :'POST',
				dataType:'JSON',
				url     :options.cgi_uri,
				data    :{
					action : 'ajax',
					rs : options.request_func,
					rsargs : [r,u]
				},
				success : function(result) {
					var xml = result['xml'];
					if(xml2js(xml)) {
						//初期読み込みでは、同期通信を行う...
						if($.data($('#wikibok-loading').get(0),'DescriptionPages') == undefined) {
							$.getDescriptionPages({},{},{async:false});
						}
						//描画完了後処理
						if($.isFunction(options.success)) {
							options.success.call(me,result);
						}
						if($.isFunction(sf)) {
							sf.call(me,result);
						}
					}
					else {
						//描画完了まで処理待機
						var res = false,
							w = setTimeout(function(){
								res = update(root);
								if(res != true) {
									setTimeout(w,1000);
								}
								else {
									//初期読み込みでは、同期通信を行う...
									if($.data($('#wikibok-loading').get(0),'DescriptionPages') == undefined) {
										$.getDescriptionPages({},{},{async:false});
									}
									//描画完了後処理
									if($.isFunction(options.success)) {
										options.success.call(me,result);
									}
									if($.isFunction(sf)) {
										sf.call(me,result);
									}
								}
							},1);
					}
				},
				error : function(result) {
					var ef = options.error;
					if(ef != undefined && $.isFunction(ef)) {
						ef.call(me,result);
					}
				},
				async : true,
				cache: false
			});
		},
		'view' : function(xml) {
			//表示のみ...
			var me = this;
			if(xml2js(xml)) {
				//初期読み込みでは、同期通信を行う...
				if($.data($('#wikibok-loading').get(0),'DescriptionPages') == undefined) {
					$.getDescriptionPages({},{},{async:false});
				}
				//描画完了後処理
				if($.isFunction(options.success)) {
					options.success.call(me);
				}
			}
		}
	}
	$.fn.extend({
		bok : BokEditor.init
	});
	var options,
		defaults = {
			'cgi_uri' : wgServer + wgScriptPath + '/index.php',
			'request_func' : 'WikiBokJs::getBokJson',
			'node' : {
				w : 180,
				h : 30
			},
			'duration' : 180,
			symbolClick : function() {
			},
			nodeClick:function(d) {
				alert(d);
			},
			edgeClick:function(d) {
				alert(d);
			}
		},
		root,
		tree,
		svg,
		vis,
		nodes = {},
		AllNodes = [],
		i = 0;
})(jQuery);
