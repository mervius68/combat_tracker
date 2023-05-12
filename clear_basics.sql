delete from tbl_condition_pool;
delete from ct_tbl_action;
delete from ct_tbl_target;
delete from ct_tbl_condition;
delete from ct_tbl_condition_affectee;
update ct_tbl_participant set dead_round = 100;