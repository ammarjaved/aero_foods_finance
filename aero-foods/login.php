<?php

include "./connection.php";

class Login extends Connection
{

   
     public function __construct()
    {
        $this->connect();
    }

    public function validate($postData)
    {
        $validate = [];
        $validateCount = true;
        
        if (!isset($postData['username']) || $postData['username'] == '' ) {
            $validate['username'] = "Username is Required";
            $validateCount = false;
        }

        if (!isset($postData['password']) || $postData['password'] == '') {
            $validate['password'] = "Password is required ";
            $validateCount = false;
        }
 
        return json_encode(['validateCount' => $validateCount , 'validate' => $validate]);
    }

    // Execute a query
    public function query($postData)
    {
        $username   = $postData['username'];
        $password   = $postData['password'];
       

        $sql1 = "SELECT * FROM users WHERE username = '$username' and password='$password' ";
        $result = pg_query($this->conn, $sql1);
        
       
        if ($row = pg_fetch_assoc($result)) {
           
            //if (password_verify($password, $row['password'])) {
                unset($row['password']);
                return json_encode(['status'=>200 , 'success' => true, 'message' => 'Login successful' , 'data'=> $row],200);
            //}
        }
       
        return json_encode(['status' => 400, 'success' => false, 'message' => 'Login failed'], 400);

    }

   
}

$pgConnection = new Login();

 

if ($_SERVER['REQUEST_METHOD'] === 'POST') { 

    $postData = $_POST;

    $validate       = $pgConnection->validate($postData);
    $validateResult = json_decode($validate);
     
    if ($validateResult->validateCount == true ) {

        $result = $pgConnection->query($postData);
        echo $result;

    }else{
        echo json_encode(['status' => 400, 'success' => false, 'error' => $validateResult->validate], 400);

    }
   
}

$pgConnection->close();
?>
