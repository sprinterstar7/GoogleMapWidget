<%@ WebHandler Language="C#" Class="ColoredShapeHandler" %>

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
using System.Drawing;
using Prism.Web.AppServices.Http.Session;

    /* WHEN DEPLOYING TO QaVM or SISENSE
     * 1. Copy this code to C:\Program Files\Sisense\PrismWeb\KMLHandler.ashx
     * 2. Uncomment 'out the using Prism.Web.AppSerices.HttpSession' (line 11) 
     * 3. Uncomment 'PrismAuthenticatedIdentity userId = (PrismAuthenticatedIdentity)context.User.Identity;' (line 73)
     * 4. Uncomment ', u = userId.Name' (line 81)
     * 5. Any non-SiSense changes to this file must also be reflected ExplorerController.cs
     */
    public class ColoredShapeHandler : IHttpHandler
    {
        private JavaScriptSerializer _serializer = null;
        private JavaScriptSerializer serializer
        {
            get
            {
                if (_serializer == null)
                {
                    _serializer = new JavaScriptSerializer { MaxJsonLength = Int32.MaxValue };
                }
                return _serializer;
            }
        }

        public void ProcessRequest(HttpContext context)
        {
            string shape = context.Request.QueryString["shape"];
            string color = context.Request.QueryString["color"];
            PrismAuthenticatedIdentity userId = (PrismAuthenticatedIdentity)context.User.Identity;

            if (!string.IsNullOrEmpty(shape) && !string.IsNullOrEmpty(color))
            {
                try
                {
                    int argb = Int32.Parse(
                            color.Substring(0, 2) +
                            color.Substring(2, 2) +
                            color.Substring(4, 2) +
                            color.Substring(6, 2),
                            System.Globalization.NumberStyles.HexNumber
                        );
                    Color newColor = Color.FromArgb(argb);
                    byte r = newColor.R;
                    string actualPath;
                    actualPath = context.Server.MapPath("~/Resources/shapes/" + shape + ".png");
                    Image img = Image.FromFile(actualPath);
                    Bitmap bmp = new Bitmap(img);
                    //from http://stackoverflow.com/questions/9871262/replace-color-in-an-image-in-c-sharp
                    for (int x = 0; x < bmp.Width; x++)
                    {
                        for (int y = 0; y < bmp.Height; y++)
                        {
                            Color gotColor = bmp.GetPixel(x, y);
                            if (gotColor.R == 255 && gotColor.G == 255 && gotColor.B == 255)
                            {
                                bmp.SetPixel(x, y, newColor);
                            }
                        }
                    }
                    context.Response.ContentType = "image/png";
                    ImageConverter conv = new ImageConverter();
                    byte[] fileData = (byte[])conv.ConvertTo(bmp, typeof(byte[]));
                    context.Response.BinaryWrite(fileData);
                }
                catch (Exception e)
                {
                    string jsonReply = serializer.Serialize(new { success = false, result = context.Request.QueryString["color"]});
                    context.Response.ContentType = "application/json";
                    context.Response.Write(jsonReply);
                }
            }
            else
            {
                string jsonReply = serializer.Serialize(new { success = false, result = context.Request.QueryString["color"] });
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
    }