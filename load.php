<?php
	// JSON headers
	header('Vary: Accept');
	if (isset($_SERVER['HTTP_ACCEPT']) && (strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)) {
		header('Content-type: application/json');
	} else {
		header('Content-type: text/plain');
	}
		
	// We need an id
	if($_POST['id']){
		$id = substr($_POST['id'], 1);
		// Connect to DB
		$host = $_SERVER['HTTP_HOST'] == 'khakaure.oodavid.com' ? 'mysql50-18.wc2.dfw1.stabletransit.com' : '174.143.28.21';
		$DBH = new PDO("mysql:host={$host};dbname=497873_khakaure;charset=UTF-8", '497873_khakaure', 'K7rE91G174');
		// Select the children
		$STH = $DBH->prepare('SELECT * FROM `khakaure2` WHERE `parent`=:parent LIMIT 30;');
		$STH->execute(array( 'parent' => $id ));
		$rows = $STH->fetchAll(PDO::FETCH_ASSOC);
		// Manually assemble the JSON as json-encode would encode the JSON object in the database!!
		$objects = array();
		foreach($rows as $row){
			$row['data'] = trim(trim($row['data']), ",");
			$objects[] = <<<HEREJSON
			{ "id": "i{$row['id']}", "parent": "i{$row['parent']}", "data": {$row['data']} }
HEREJSON;
		}
		echo '[' . implode($objects, ',') . ']';
	}
?>
