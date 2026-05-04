using System;
using System.Data.SqlClient;

class Program
{
    static void Main()
    {
        string connectionString = "Server=(localdb)\\mssqllocaldb;Database=SGPF_Db;Trusted_Connection=True;MultipleActiveResultSets=true";
        try
        {
            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();
                SqlCommand command = new SqlCommand("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Afastamentos'", connection);
                using (SqlDataReader reader = command.ExecuteReader())
                {
                    Console.WriteLine("Colunas em Afastamentos:");
                    while (reader.Read())
                    {
                        Console.WriteLine($"{reader[0]} - {reader[1]}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}
