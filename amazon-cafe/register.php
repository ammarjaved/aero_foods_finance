<?php

include "./connection.php";

class Register extends Connection
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

        if (!isset($postData['password']) || $postData['password'] == ''  || strlen($postData['password']) < 5) {
            $validate['password'] = "Password is required and must be greater than 8 char";
            $validateCount = false;
        }

        if (!isset($postData['first_name']) || $postData['first_name'] == '' ) {
            $validate['first_name'] ="First Name is required";
            $validateCount = false;
        }

        if (!isset($postData['email']) || $postData['email'] == '') {
            $validate['email'] = "Email is Required or Invalid Email";
            $validateCount = false;
        }

        return json_encode(['validateCount' => $validateCount , 'validate' => $validate]);
    }

    // Execute a query
    public function query($postData)
    {
        $username   = $postData['username'];
        $password   = password_hash($postData['password'],PASSWORD_DEFAULT);
        $first_name = $postData['first_name'];
        $last_name  = $postData['last_name'];
        $email      = $postData['email'];
        $gender     = $postData['gender'];
        date_default_timezone_set('Asia/Kuala_Lumpur');
        $dob        = empty($postData['dob']) ? null : $postData['dob'];

        $sql1 = "SELECT count(*) FROM users WHERE username = '$username'";
        $result1 = pg_query($this->conn, $sql1);
        $res1 = pg_fetch_all($result1);

       if ($res1[0]['count'] < 1) {
         
            if ($dob == null) {
                $sql = "INSERT INTO users (username , password , email , first_name , last_name , gender   ) VALUES ('$username' , '$password' , '$email', '$first_name' , '$last_name' , '$gender'  )";
            }else{
                $sql = "INSERT INTO users (username , password , email , first_name , last_name , gender  ,dob ) VALUES ('$username' , '$password' , '$email' , '$first_name' , '$last_name' , '$gender' , '$dob'  )";
            }
        
            $result = pg_query($this->conn, $sql);

            if (is_resource($result) ) {
                
                
                return json_encode(['status' => 200, 'success' => true], 200);
            }
       
            return json_encode(['status' => 400, 'success' => false, 'error' => 'Query execution failed.'], 400);

        } 
        return json_encode(['status' => 400, 'success' => false, 'error' => 'username is already exists'], 400);

    }

   
}

$pgConnection = new Register();

 

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
