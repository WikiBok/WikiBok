-- SQL tables for WikiBok extension
CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/wbs_boktree (
  `rev` int(10) unsigned not null auto_increment,
  `bok` longtext,
  `new_ids` longtext,
  `del_ids` longtext,
  `user_id` int(10) not null,
  `time` timestamp not null default current_timestamp,
  primary key `rev` (`rev`),
  key `user_id` (`user_id`),
  key `time` (`time`)
) /*$wgDBTableOptions*/;

CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/wbs_userboktree (
  `session_id` varchar(255) not null,
  `rev` int(10) unsigned not null,
  `bok` longtext,
  `user_id` int(10) not null,
  `time` timestamp not null default current_timestamp,
  primary key `user_edit` (`session_id`,`user_id`,`rev`),
  key `user_id` (`user_id`),
  key `time` (`time`)
) /*$wgDBTableOptions*/;

CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/wbs_saveboktree (
  `user_id` int(10) not null,
  `title` varchar(255) not null,
  `base_rev` int(10) unsigned not null,
  `bok_xml` longtext,
  `comment` longtext,
  `time` timestamp not null default current_timestamp,
  primary key `save` (`user_id`,`title`),
  key `base_rev` (`base_rev`),
  key `time` (`time`)
) /*$wgDBTableOptions*/;

CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/wbs_mergerclass (
  `merge_rev` int(10) unsigned not null,
  `item_name` varchar(255) not null,
  `value_name` varchar(255) not null default '',
  `value` varchar(255) not null,
  `search_flg` tinyint(1) not null default 0,
  `sort_order` int(10) not null default 0,
  `user_id` int(10) not null,
  `time` timestamp not null default current_timestamp,
  primary key `rev` (`merge_rev`,`item_name`,`value_name`),
  key `form` (`merge_rev`,`search_flg`)
) /*$wgDBTableOptions*/;

CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/wbs_wkrepresent (
  `id` bigint unsigned not null auto_increment,
  `session_id` varchar(255) not null,
  `user_id` int(10) not null,
  `rev` int(10) unsigned not null,
  `source` varchar(255) not null,
  `target` varchar(255) not null,
  `time` timestamp not null default current_timestamp,
  primary key `id` (`id`),
  key `filter` (`session_id`,`user_id`,`rev`),
  key `source` (`source`),
  key `time` (`time`)
) /*$wgDBTableOptions*/;

CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/wbs_conflictlog (
  `id` int(10) unsigned not null auto_increment,
  `type` varchar(255) not null,
  `base_rev` int(10) unsigned not null,
  `head_rev` int(10) unsigned not null,
  `work_xml` longtext,
  `merge_rev` int(10) unsigned not null,
  `user_id` int(10) not null,
  `time` timestamp not null default current_timestamp,
  primary key `id` (`id`),
  key `type` (`type`),
  key `merge_rev` (`merge_rev`),
  key `user_id` (`user_id`),
  key `time` (`time`)
) /*$wgDBTableOptions*/;

CREATE TABLE IF NOT EXISTS /*$wgDBprefix*/wbs_displog (
  `id` bigint unsigned not null auto_increment,
  `rev` int(10) unsigned not null,
  `user_id` int(10) not null default '',
  `title` varchar(255) not null default '',
  `allreps` longtext,
  `description_pages` longtext,
  `type` tinyint(1) not null default 0,
  `time` timestamp not null default current_timestamp,
  primary key `id` (`id`),
  key `oldview` (`rev`),
  key `saveview` (`user_id`,`title`)
) /*$wgDBTableOptions*/;
