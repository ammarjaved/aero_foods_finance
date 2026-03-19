<?php 

class Connection  
{
    private $host = '192.168.1.34';
    private $port = '5432';
    private $dbname = 'aero_foods_finance';
    private $user = 'postgres';
    private $password = 'Admin123';
    protected $conn;

    // Connect to the database
    public function connect()
    {
        $dsn = "host={$this->host} port={$this->port} dbname={$this->dbname} user={$this->user} password={$this->password}";
        $this->conn = pg_connect($dsn);

        if (!$this->conn) {
            die('Connection failed: ' . pg_last_error());
        }
    }

     // Close the database connection
     public function close()
     {
         pg_close($this->conn);
     }
}



?>