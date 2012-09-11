/**
 * BokEditor描画用Javascript関数群
 *  - (d3.v2.jsの拡張ライブラリ)
 */
(function($){
	/**
	 * パラメータ2つを元に座標表現文字列を作成
	 * @param x 横[省略時:0]
	 * @param y 縦[省略時:0]
	 */
	function _pos(x,y) {
		return (x || 0)+','+(y || 0);
	}
	/**
	 * 指定半径の円に内接する横向き三角(▶)の座標文字列を作成
	 * @param r 半径
	 */
	function triangel(r) {
		var
			x = r / Math.sqrt(3),
			y = x * 2,
			_x = x * (-1),
			_y = y * (-1),
			mpos = [_pos(_x,_y),_pos(r,0),_pos(_x,y)];
			return mpos.join(' ');
	}
	/**
	 * 指定半径の円に内接する正方形(■)の座標文字列を作成する
	 */
	function rect(r) {
		var
			l = Math.sqrt(2) * r / 2,
			_l = l * (-1);
			mpos = [
				_pos(_l,_l),
				_pos( l,_l),
				_pos( l, l),
				_pos(_l, l),
				_pos(_l,_l)
			];
			return mpos.join(' ');
	}
	function serarchNode(a,b) {
		var
			_target,
			inp = a.replace(/\W/g,'\\$&'),
			reg = new RegExp((arguments.length < 2 || b == false) ? ('^'+inp+'$') : inp);

		if(allData == null) return false;
		_target = tree.nodes(allData).filter(function(d) {
			return (d.name.match(reg))
		});
		return (_target.length < 1) ? false : _target;
	}
	/**
	 * BOK-XMLからD3ライブラリで利用するデータ形式に変換
	 *   - XMLデータはthisとして渡すこと(callメソッド必須)
	 */
	function convert() {
		var
			me = $(this),
			cs = [];
		//同一階層のデータをチェック
		$.each(me,function(i,o) {
			var
				//	名称、子ノードの取得
				n = $(o).find('>name').text(),
				c = $(o).find('>nodes'),
				cn = $(c).find('>node'),
				_cs = null;
			if(c.length > 0) {
				_cs = convert.call(cn);
			}
			cs.push({
				name : n,
				children : _cs
			});
		});
		return cs;
	}
	function load(xml) {
		var	root = convert.call($(xml));
		allData = root[0];
		return update(allData)
	}
	function update(source) {
		var
			diagonal = d3.svg
				.diagonal()
				.projection(function(d) {
					return [((d.y == undefined) ? 0 : d.y) , ((d.x == undefined) ? 0 : d.x)]
				}),
			nodes = tree.nodes(allData).reverse().filter(function(d){
				//TOPノードを排除
				return (d.depth > 0);
			}),
			links = tree.links(nodes).filter(function(d) {
				return (d.source.depth > 0);
			});
		setSize(getSize());
		//深さで横位置を決定
		nodes.forEach(function(d) {
			d.y = (d.depth - 1) * options.w + d.depth * 5;
		});
		var
			i = 0,
			node = vis
				.selectAll('g.node')
				.data(nodes,function(d){return d.id || (d.id = ++i);}),
			link = vis
				.selectAll('path.link')
				.data(links,function(d){return d.target.id;}),
			add = node.enter()
				.append('svg:g')
				.attr('id',function(d) {return d.name})
				.attr('transform',function(d) {
					return 'translate('+_pos(source.y0,source.x0)+')';
				})
				.classed('node',true);

		//折り畳み用アイコンタグの追加
		add.append('svg:polygon')
			.attr('points',function(d){
				var	r = d.r || 4.5;
				return (d.children ? rect(r) : ((d._children) ? triangel(r) : rect(r)));
			})
			.on('click.add', options.polygonClick)
			.on('click.orig', function(d) {
				//トグル動作
				if (d.children) {
					d._children = d.children;
					d.children = null;
				}
				else {
					d.children = d._children;
					d._children = null;
				}
				update(d);
			});
		//ノード名称タグの追加
		add.append('svg:text')
			.attr('x', 8)
			.attr('y', 3)
			.attr('data',function(d){return d.name;})
			.text(function(d) { return d.name; })
			.on('click.add', options.textClick)
			.on('click.orig', function(d){});
		node
			.classed(options.node.class,options.node.func)
			.transition()
			.duration(options.duration)
			.attr('transform',function(d) {
				return 'translate('+_pos(d.y,d.x)+')';
			})
		.selectAll('polygon')
			.attr('data',function(d){return d.name;})
			.attr('points',function(d){
				var r = d.r || 4.5;
				return (d.children ? rect(r) : ((d._children) ? triangel(r) : rect(r)));
			});
		node.exit().transition()
			.duration(options.duration)
			.attr('transform',function(d) {return 'translate('+_pos(source.y,source.x)+')'})
			.remove();
		//エッジタグ
		link.enter()
				.insert('svg:path','g')
				.classed('link',true)
				.attr('d',function(d) {
					var o = {x:(d.source.x0 || 0),y:(d.source.y0 || 0)};
					return diagonal({source: o , target : o});
				})
				.on('click.add',options.pathClick)
				.on('click.orig',function(d){});
		link.transition()
				.duration(options.duration)
				.attr('d',function(d) {
						var s = {x:(d.source.x || 0),y:(d.source.y || 0)},
								t = {x:(d.target.x || 0),y:(d.target.y || 0)};
						return diagonal({source: s , target : t});
				});
		link.exit().transition()
				.duration(options.duration)
				.attr('d',function(d) {
						var o = {x:(d.source.x || 0),y:(d.source.y || 0)};
						return diagonal({source: o , target : o});
				})
				.remove();
		//再配置済みデータを旧配置データとして設定
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
	}
	function addNode(a,b) {
		var
			c = {name : a,children : null},
			p = searchNode('')[0],
			add = p.children || p._children || [];
		if(serarchNode(a) == false) {
			add.push(c);
		}
		else {
			//既存ノードあり
		}
	}
	function moveNode(a,b) {
		var
			c = (serarchNode(a))[0],
			p = (serarchNode(b) || searchNode(''))[0],
			add = p.children || p._children || [],
			del = c.parent.children || c.parent._children,
			del_id;
		if(seachNode(a) == false) {
		}
		else {
			add.push(c);
			del_id = $.map(del,function(d,i) {if (d.name == a) return i}).reverse();
			$.each(del_id,function(d) {
				del.splice(d,1);
			});
		}
//			update(allData);
	}
	function delNode() {
	}
	/**
	 * キャンパスサイズを設定
	 */
	function setSize(s) {
		var
			w = s[1],
			h = s[0],
			view = '0 0 '+w+' '+h;
		tree.size(s);
		svg.attr('width',w)
			.attr('height',h)
			.attr('viewBox',view);
	}
	/**
	 * ノード数と階層より必要なキャンパスサイズを算出
	 */
	function getSize() {
		var
			n = tree.nodes(allData),
			hc = ($.unique($.map(n,function(d){return [d.x]})).length || 1) + 1,
			wc = Math.max.apply({},$.map(n,function(d){return [d.depth]})) || 1;
		return $.map([hc * options.h , wc * options.w],Math.ceil);
	}
	/**
	 * 描画用キャンパスの初期設定
	 */
	function makeCanvas() {
		tree = d3.layout.tree();
		svg = d3.select(this.get(0)).append('svg:svg').attr('id','BokXml');
		vis = svg.append('svg:g')
			.attr('transform','translate(10,10)');
	}
	var
		tree,
		svg,
		vis,
		allData = null,
		options = {
			w : 180,
			h : 60,
			duration : 10,
			node : {
				class : '',
				func : function() {return false;}
			}
		},
		BokEditor = {
			init : function(option) {
				options = $.extend({},options,option);
				makeCanvas.call(this);
				return BokEditor;
			},
			load : load,
			update : function(source) {
				if(arguments.length < 1) {
					update(allData);
				}
				else {
					update(source);
				}
			},
			addNode : addNode
		};
	$.fn.extend({
		bok : BokEditor.init,
	});
})(jQuery);
