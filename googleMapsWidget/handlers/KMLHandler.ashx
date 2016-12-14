<%@ WebHandler Language="C#" Class="KMLHandler" %>

using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Security.Cryptography;
//using System.Web.Mvc;
using System.Text;
using System.IO;
using Newtonsoft.Json;
using System.Web.Script.Serialization;
using Prism.Web.AppServices.Http.Session;

public class KMLHandler : IHttpHandler
{
	private byte[] saltBytes = new byte[] { 15, 9, 12, 23, 5, 12, 12, 19 };
    private string encrypt = "N@vP0rt2016!";
    private JavaScriptSerializer _serializer = null;
    private JavaScriptSerializer serializer
    {
        get {
            if (_serializer == null)
            {
                _serializer = new JavaScriptSerializer { MaxJsonLength = Int32.MaxValue };
            }
            return _serializer;
        }
    }

	public void ProcessRequest(HttpContext context)
	{
	    int id = -1;
        string username = context.Request.QueryString["username"];
        bool result = Int32.TryParse(context.Request.QueryString["ID"], out id);
        string fileName;

        if (result)
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
                    fileName = "Transload 11-29.kml";
                    break;
                case 5:
                    fileName = "Prop Mines 11-29.kml";
                    break;
                //RSEG KMZ Files
                case 6:
                    fileName = "RS Eagle Ford CHK Land 2016_09.kmz";
                    break;
                case 7:
                    fileName = "RS Eagle Ford CRZO Land 2016_09.kmz";
                    break;
                case 8:
                    fileName = "RS Eagle Ford MRO Land 2016_09.kmz";
                    break;
                case 9:
                    fileName = "RS Eagle Ford XCO Land 2016_09_Part_One.kmz";
                    break;
                case 10:
                    fileName = "RS Eagle Ford XCO Land 2016_09_Part_Two.kmz";
                    break;
                case 11:
                    fileName = "RSEG Eagleford Combined 1.kmz";
                    break;
                case 12:
                    fileName = "RSEG Eagleford Combined 2.kmz";
                    break;
                case 13:
                    fileName = "RSEG Eagleford Combined 3.kmz";
                    break;
                case 14:
                    fileName = "RSEG Eagleford Combined 4.kmz";
                    break;
                case 15:
                    fileName = "Barnett2.kmz";
                    break;
                case 16:
                    fileName = "DJ Basin Combined 1.kmz";
                    break;
                case 17:
                    fileName = "DJ Basin Combined 2.kmz";
                    break;
                case 18:
                    fileName = "Eaglebine.kmz";
                    break;
                case 19:
                    fileName = "Fayetteville.kmz";
                    break;
                case 20:
                    fileName = "Haynesville.kmz";
                    break;
                case 21:
                    fileName = "Marcellus.kmz";
                    break;
                case 22:
                    fileName = "Permian Combined 1.kmz";
                    break;
                case 23:
                    fileName = "Permian Combined 2.kmz";
                    break;
                case 24:
                    fileName = "Permian Combined 3.kmz";
                    break;
                case 25:
                    fileName = "Permian Combined 4.kmz";
                    break;
                case 26:
                    fileName = "PRB.kmz";
                    break;
                case 27:
                    fileName = "San Juan.kmz";
                    break;
                case 28:
                    fileName = "TMS.kmz";
                    break;
                case 29:
                    fileName = "Utica Combined 1.kmz";
                    break;
                case 30:
                    fileName = "Utica Combined 2.kmz";
                    break;
                case 31:
                    fileName = "Woodford.kmz";
                    break;
                default:
                    fileName = "Midwest Rail.kml";
                    break;
            }
            var utcNow = DateTime.UtcNow;
            string token = username + "|" + utcNow.ToString() + "|" + fileName;
            string t = context.User.Identity.Name;
            PrismAuthenticatedIdentity userId = (PrismAuthenticatedIdentity)context.User.Identity;
            byte[] tokenArray = Encoding.UTF8.GetBytes(token);
            byte[] tokenBuffer = EncryptToken(tokenArray);
            token = Convert.ToBase64String(tokenBuffer);
                	
            if (context.Response != null)
            {
                string jsonReply = serializer.Serialize( new { success = true, token = token, t = t, u = userId.Name } );
                context.Response.ContentType = "application/json";
                context.Response.Write(jsonReply);
            }
            else
            {
                string jsonReply = serializer.Serialize( new { success = false, result = "B" } );
                context.Response.ContentType = "application/json";
                context.Response.Write(jsonReply);
            }
        }
        else
        {
            string jsonReply = serializer.Serialize( new { success = false, result = context.Request.QueryString["ID"] } );
            context.Response.ContentType = "application/json";
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
}