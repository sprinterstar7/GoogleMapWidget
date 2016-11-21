<%@ WebHandler Language="C#" Class="Handler" %>

using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Net;
using System.Web.Script.Serialization;
using System.IO;
using Prism.Web.AppServices.Http.Session;
using System.Collections.Generic;
using JWT;
using System.Configuration;
using Newtonsoft.Json.Linq;
using System.Collections.Specialized;

/// <summary>
///  Returns all data including unauthorized data.
///  If data security is defined for the current user, Sets the value of request parameter 'dim' (break by/color dimension) of unauthorized data to DEFAULT_VALUE.
///  Returns empty data set in case the count of distinct THRESHOLD_TABLE.THRESHOLD_COLUMN values is smaller than VALUES_THRESHOLD.
/// </summary>
public class Handler : IHttpHandler {
    
 
    private string baseUrl;
    private Dictionary<string, object> datasource;

    private string defaultResult;

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
    
    /// <summary>
    ///  Enables processing of HTTP Web requests by a custom HttpHandler that implements
    ///  the System.Web.IHttpHandler interface.
    /// </summary> 
    /// <param name="context">
    ///  An System.Web.HttpContext object that provides references to the intrinsic
    ///  server objects (for example, Request, Response, Session, and Server) used
    ///  to service HTTP requests.
    /// </param>
    public void ProcessRequest (HttpContext context) 
    {
        try
        {

            defaultResult = "{\"headers\":[],\"metadata\":[],\"values\":[]}";
            int zoomLevel = Int32.Parse(context.Request.QueryString["zoomLevel"]);
            
            //Get the current user
            PrismAuthenticatedIdentity userIdentity = (PrismAuthenticatedIdentity)context.User.Identity;
       
            
            //calculate base URL
            baseUrl = context.Request.Url.Scheme + "://" + context.Request.Url.Authority + context.Request.ApplicationPath.TrimEnd('/') + "/"; 

            //get request data
            context.Request.InputStream.Position = 0; 
            StreamReader inputStream = new StreamReader(context.Request.InputStream);
            string originalReq = inputStream.ReadToEnd();

            string query = "SELECT [Major Basin] "
                           + "     , Count(*) as Count"
                           + "     , Avg(Latitude) as Latitude"
                           + "     , Avg(Longitude) as Longitude"
                           + " FROM Well"
                           + " WHERE Latitude IS NOT NULL AND Longitude IS NOT NULL"
                           + "     AND Latitude BETWEEN 39.7198 AND 42.499847 AND Longitude BETWEEN -80.518992 AND -74.701944 ";


            switch (zoomLevel)
            {
                case -1:
                    query += "GROUP BY [Latitude-1], [Longitude-1], [Major Basin]";
                    break;
                case 0:
                    query += "GROUP BY Latitude0, Longitude0, [Major Basin]";
                    break;
                case 1:
                    query += "GROUP BY Latitude1, Longitude1, [Major Basin]";
                    break;
                case 2:
                    query += "GROUP BY Latitude2, Longitude2, [Major Basin]";
                    break;
                case 3:
                    query += "GROUP BY Latitude3, Longitude3, [Major Basin]";
                    break;
                case 4:
                    query += "GROUP BY Latitude4, Longitude4, [Major Basin]";
                    break;
                default:
                    query += "GROUP BY Latitude, Longitude, [Major Basin]";
                    break;
            }


            //get data source
            var jsonDict = serializer.Deserialize<dynamic>(originalReq);
            jsonDict.Add("sql", query);
            datasource = jsonDict["datasource"];
            
     
                //original jaql using user's cookie
            string authorizedData = getAuthorizedData(context.Request.Headers["Cookie"], originalReq);

           
            context.Response.Write(authorizedData);
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
        }       
    }


    /// <summary>
    /// Get authorized data
    /// </summary>
    /// <param name="cookie"></param>
    private string getAuthorizedData(string cookie, string requestUserJson)
    {
        //create http request
        HttpWebRequest request = (HttpWebRequest)WebRequest.Create(baseUrl + "/api/datasources/" + datasource["title"] + "/jaql");
        
        
        request.Method = "POST";
        request.ContentType = "application/json; charset=utf-8";
        request.Headers.Add("Cookie", cookie);

        StreamWriter streamWriter = new StreamWriter(request.GetRequestStream());

        streamWriter.Write(requestUserJson);
        streamWriter.Flush(); 

        //get response
        HttpWebResponse response = (HttpWebResponse)request.GetResponse();
        StreamReader reader = new StreamReader(response.GetResponseStream());
        string userData = reader.ReadToEnd();

        return userData;
    }

  

    #region helpers
    /*********************** HELPERS ***********************/
    /*******************************************************/

    /// <summary>
    /// Check if metadata item is a filter
    /// </summary>
    /// <param name="metadataItem">metadata item from users query</param>
    /// <returns></returns>
    private bool isFilter(Dictionary<string, object> metadataItem)
    {
        return metadataItem.ContainsKey("panel") && metadataItem["panel"].ToString() == "scope";
    }
    

    /// <summary>
    /// Build basic jaql query object - dont use it, this doesnt cover the case that same elasticube name can appear on different servers
    /// </summary>
    /// <param name="datasource">string</param>
    /// <returns></returns>
    private Dictionary<string, dynamic> CreateJAQLQuery(string datasource)
    {
        Dictionary<string, dynamic> query = new Dictionary<string, dynamic>(){
            {
                "datasource",datasource
            },
            {
                "metadata", new List<Dictionary<string, dynamic>>()
            }
        };

        return query;
    }

    /// <summary>
    /// Build basic jaql query object - better implemention covers the case of different server with same elasticube name
    /// </summary>
    /// <param name="datasource">object</param>
    /// <returns></returns>
    private Dictionary<string, dynamic> CreateJAQLQuery(Dictionary<string, object> datasource)
    {
        Dictionary<string, dynamic> query = new Dictionary<string, dynamic>(){
            {
                "datasource",datasource
            },
            {
                "metadata", new List<Dictionary<string, dynamic>>()
            }
        };

        return query;
    }
    
    /// <summary>
    /// Create url to send jaql queries to.
    /// </summary>
    /// <param name="datasource"></param>
    /// <returns></returns>
    private string GetJAQLURL(string datasource)
    {
        return baseUrl + "/api/datasources/" + datasource + "/jaql";
    }
    

    /// <summary>
    /// Create user request using current users cookie
    /// </summary>
    /// <param name="url">url to send the request to</param>
    /// <param name="cookie">valid prism cookie</param>
    /// <param name="method">Method of request - get is default</param>
    /// <param name="contentType"></param>
    /// <returns></returns>
    private HttpWebRequest createUserRequest(string url, string cookie, string method = "GET", string contentType = "application/json")
    {
        try
        {
            HttpWebRequest request = createRequest(url, method, contentType);

            request.Headers["Cookie"] = cookie;
            return request;
        }
        catch (Exception ex)
        {
            throw;
        }
    }

    /// <summary>
    /// Create http request
    /// </summary>
    /// <param name="url">url to send the request to</param>
    /// <param name="method">Method of request - get is default</param>
    /// <param name="contentType"></param>
    /// <returns></returns>
    private HttpWebRequest createRequest(string url, string method = "GET", string contentType = "application/json")
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);

            request.Method = method;
            request.ContentType = contentType;

            return request;
        }
        catch (Exception ex)
        {
            throw;
        }
    }
    
    /// <summary>
    /// Send request 
    /// </summary>
    /// <param name="request">web request</param>
    /// <param name="payload">stringified payload</param>
    /// <returns>stringified result set</returns>
    private string SendRequest(HttpWebRequest request, string payload = null)
    {
        try
        {
            if (payload != null)
            {

                StreamWriter streamWriter = new StreamWriter(request.GetRequestStream());

                streamWriter.Write(payload);
                streamWriter.Flush();
            }

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                using (StreamReader reader = new StreamReader(response.GetResponseStream()))
                {
                    string stringifiedResult = reader.ReadToEnd();

                    return stringifiedResult;
                }
            }
        }
        catch (Exception ex)
        {
            return defaultResult;
        }
    }
    #endregion
    
    public bool IsReusable {
        get {
            return false;
        }
    }
}