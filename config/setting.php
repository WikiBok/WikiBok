<?php
# BOK-XMLデータ格納先Databaseへのアクセス情報
define('BOK_DATABASE_HOST','');
define('BOK_DATABASE_DB','');
define('BOK_DATABASE_USER','');
define('BOK_DATABASE_PASS','');
# INSTALL環境によって変更あり
define('PHPCOM','php');
define('SVGCONVERT_CMD','rsvg-convert');
define('SVGCONVERT_FOLDER',realpath($_SERVER["DOCUMENT_ROOT"]."/../dot/"));
define('SVGCSS_FILE',realpath(__DIR__.'/../css/WikiBok.svg.css'));
# 仮決めでA4を設定(拡大印刷する場合にはPDFを拡大印刷してください)
define('SVGCONVERT_A4W', 794); #用紙サイズ(横)
define('SVGCONVERT_A4H',1123); #用紙サイズ(縦)
# クラスファイル名称
define('BOK_MERGER_XMLCLASS','BokXml.class.php');
define('BOK_MERGER_MERGERCLASS','BokXmlMerger.class.php');
########################################
#   BOK-XMLの設定
########################################
define('BOK_SETTING','BOKXML');
# XMLスキーマファイルの設定
define('BOKXML_SCHEMAFILE',realpath(dirname(__FILE__))."/BOK_schema.xml");
define('BOKXML_SEPARATE_CHAR',"\0");
# MBT算出用設定
define('BOKXML_DELNODE_FULL',TRUE);	#DS算出で自身のノードを含める/含めない
# IS算出で自身のノードを含める/含めない(ロジックの関係上,変更不可/上記の反対を採用とする)
define('BOKXML_INSNODE_FULL',!BOKXML_DELNODE_FULL);
########################################
#   Mergerの設定
########################################
#競合解消に使用するリビジョン番号
define('BOKMERGE_ACTIVE_REV',1);
# PAGER
define('WIKIBOK_SEARCH_PAGE_MIN',20);
define('WIKIBOK_SEARCH_PAGE_MAX',1600);
define('WIKIBOK_SEARCH_PAGE_PLUS',50);
