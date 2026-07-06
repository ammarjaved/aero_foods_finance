<?php

include "./connection.php";

class Sql extends Connection
{

   
     public function __construct()
    {
        $this->connect();
    }

    // Execute a query
    public function query($sql , $name)
    {
        if ($sql != '') {
            $result = pg_query($this->conn, $sql);

            if (is_resource($result) ) {
                $res = pg_fetch_all($result);
                if ($name == 'insert') {
                    return json_encode(['status' => 200, 'success' => true ], 200);
                } 
				if($res==false){
					$res=[];
				}
                return json_encode(['status' => 200, 'success' => true, 'data' => $res], 200);
            }
        }
        return json_encode(['status' => 400, 'success' => false, 'error' => 'Query execution failed.'], 400);
    }

   
}

$pgConnection = new Sql();

 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['function_name'])) {
        $qury = $_POST['qury'];
        $name = $_POST['function_name'];
        $result = $pgConnection->query($qury, $name);
        echo $result;
    } else {
        echo json_encode(['status' => 404,'error' => 'Invalid Request'],404);
    }
}

$pgConnection->close();
?>
