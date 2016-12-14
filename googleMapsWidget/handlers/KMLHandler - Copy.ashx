<%@ WebHandler Language="C#" Class="KMLHandler" %>

using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Security.Cryptography;
using System.Web.Mvc;
using System.Text;
using System.IO;
//using Newtonsoft.Json;

    /// <summary>
    /// Summary description for KMLHandler
    /// </summary>
    /// <param name="context">HTTP Context that has the request that needs further process of login to Sisense.</param>
    public class KMLHandler : IHttpHandler
    {
        private byte[] saltBytes = new byte[] { 15, 9, 12, 23, 5, 12, 12, 19 };
        private string encrypt = "N@vP0rt2016!";
        public void ProcessRequest(HttpContext context)
        {
            int id = -1;
            bool result = Int32.TryParse(context.Request.QueryString["ID"], out id);
            string fileName;
            if (false)//result)
            {
                switch (id)
                {
                    case 0:
                        fileName = "Midwest Rail.kml";
                        break;
                    case 1:
                        fileName = "Northeast Rail.kml";
                        break;
                    case 2:
                        fileName = "South Rail.kml";
                        break;
                    case 3:
                        fileName = "West Rail.kml";
                        break;
                    case 4:
                        fileName = "Terminals 10-6.kml";
                        break;
                    case 5:
                        fileName = "Mines 10-6.kml";
                        break;
                    default:
                        fileName = "Midwest Rail.kml";
                        break;
                }
                var utcNow = DateTime.UtcNow;
                string token = context.User.Identity.Name + "|" + utcNow.ToString() + "|" + fileName;
                byte[] tokenArray = Encoding.UTF8.GetBytes(token);
                byte[] tokenBuffer = EncryptToken(tokenArray);
                token = Convert.ToBase64String(tokenBuffer);
                if (System.Web.HttpContext.Current.Response != null)
                {
                    JsonResult json = new JsonResult();
                    json.Data = new { success = true, token = token };
                    string jsonReply = JsonConvert.SerializeObject(json);
                    //context.Response.ContentType = "text/plain";
                    context.Response.ContentType = "application/json";
                    context.Response.Write(jsonReply);
                }
                else
                {
                    JsonResult json = new JsonResult();
                    json.Data = new { success = false };
                    string jsonReply = JsonConvert.SerializeObject(json);
                    //context.Response.ContentType = "text/plain";
                    context.Response.ContentType = "application/json";
                    context.Response.Write(jsonReply);
                }
            }
            else
            {
                //JsonResult json = new JsonResult();
                //json.Data = new { success = false };
                string jsonReply = "hello world";//JsonConvert.SerializeObject(json);
                context.Response.ContentType = "text/plain";
                //context.Response.ContentType = "application/json";
                context.Response.Write(jsonReply);
            }
        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }

        //http://www.codeproject.com/Articles/769741/Csharp-AES-bits-Encryption-Library-with-Salt
        private byte[] EncryptToken(byte[] token)
        {
            if (token == null || token.Length <= 0)
                throw new ArgumentNullException("tokenArray");
            byte[] encrypted;

            using (MemoryStream ms = new MemoryStream())
            {
                using (RijndaelManaged AES = new RijndaelManaged())
                {
                    AES.KeySize = 256;
                    AES.BlockSize = 128;

                    var key = new Rfc2898DeriveBytes(encrypt, saltBytes, 1000);
                    AES.Key = key.GetBytes(AES.KeySize / 8);
                    AES.IV = key.GetBytes(AES.BlockSize / 8);

                    AES.Mode = CipherMode.CBC;

                    using (var cs = new CryptoStream(ms, AES.CreateEncryptor(), CryptoStreamMode.Write))
                    {
                        cs.Write(token, 0, token.Length);
                        cs.Close();
                    }
                    encrypted = ms.ToArray();
                }
            }
            return encrypted;
        }

        private string DecryptToken(byte[] tokenArray)
        {
            if (tokenArray == null || tokenArray.Length <= 0)
                throw new ArgumentNullException("tokenArray");

            byte[] tokenBytes;
            string token = null;

            using (MemoryStream ms = new MemoryStream())
            {
                using (RijndaelManaged AES = new RijndaelManaged())
                {
                    AES.KeySize = 256;
                    AES.BlockSize = 128;

                    var key = new Rfc2898DeriveBytes(encrypt, saltBytes, 1000);
                    AES.Key = key.GetBytes(AES.KeySize / 8);
                    AES.IV = key.GetBytes(AES.BlockSize / 8);

                    AES.Mode = CipherMode.CBC;

                    using (var cs = new CryptoStream(ms, AES.CreateDecryptor(), CryptoStreamMode.Write))
                    {
                        cs.Write(tokenArray, 0, tokenArray.Length);
                        cs.Close();
                    }
                    tokenBytes = ms.ToArray();
                }
            }
            token = Encoding.UTF8.GetString(tokenBytes);
            return token;
        }
    }