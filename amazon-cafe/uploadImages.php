<?php

include "./connection.php";

class UploadImages extends Connection
{

   
     public function __construct()
    {
        $this->connect();
    }

    public function validate($postData)
    {
        $validate = [];
        $validateCount = true;
        
        if (!isset($postData['id']) || $postData['id'] == '' ) {
            $validate['id'] = "Id is Required";
            $validateCount = false;
        }

        if (isset($postData['table_name']) && $postData['table_name'] != '' ) {
           if($postData['table_name'] != "daily_sheet" && $postData['table_name'] != "targets" && $postData['table_name'] != "log_sheet"){
            $validate['table_name'] = "Table Name is incorrect ";
            $validateCount = false;
           }
        }else{
            $validate['table_name'] = "Table Name is required ";
            $validateCount = false;
        }

       
        return json_encode(['validateCount' => $validateCount , 'validate' => $validate]);
    }

    // Execute a query
    public function query($postData)
    {
        $tableName = $postData['table_name'];
        $id = $postData['id'];

        $sql1 = "SELECT * FROM $tableName where id = $id";
        $result1 = pg_query($this->conn, $sql1);
       $query = "";
        $data = [];
       if ($row = pg_fetch_assoc($result1)) {
       
       
        $targetDirectory = "images/".$postData['table_name']."/";
        $i = 0;
        foreach ($_FILES as $fileKey => $fileInfo) {              
            if ($fileInfo["error"] == 0) {

                $existingImage = $row[$fileKey];

                if (file_exists( $existingImage)) {
                     unlink($existingImage) ;
                }

                $targetFile = $targetDirectory .time(). "-".$i."-". basename($fileInfo["name"]);
                $sql = "UPDATE $tableName SET $fileKey = '$targetFile'  where id = $id";
                $data[$fileKey] = $fileInfo["name"];
                if (pg_query($this->conn, $sql)) {
                    if (!move_uploaded_file($fileInfo["tmp_name"], $targetFile)) {
                        $data[$fileKey]= "Sorry, there was an error uploading your file " . basename($fileInfo["name"]) ;
                    }
                }
            }
            $i++;
        }
        return json_encode(['status' => 200, 'success' => true, 'Message' => 'Upload successfully' , 'details' => $data], 200);
    
        }


        return json_encode(['status' => 404, 'success' => false, 'Message' => 'No recored found against this id'], 404);




     

    }

   
}

$pgConnection = new UploadImages();

 

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
