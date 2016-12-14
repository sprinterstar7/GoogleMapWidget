<%@ WebHandler Language="C#" Class="SiSenseLogout" %>

using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

public class SiSenseLogout : IHttpHandler
{
	public void ProcessRequest(HttpContext context)
	{
		HttpCookie myCookie = new HttpCookie(".prism_shared");
		myCookie.Expires = DateTime.Now.AddDays(-1d);
		context.Response.Cookies.Add(myCookie);

		HttpCookie myOtherCookie = new HttpCookie(".prism");
		myOtherCookie.Expires = DateTime.Now.AddDays(-1d);
		context.Response.Cookies.Add(myOtherCookie);

		// Web Address for redirection
		String redirectUrl = "http://qavm.eastus2.cloudapp.azure.com/Account/Login";

		context.Response.Redirect(redirectUrl);
	}

	public bool IsReusable
	{
		get
		{
			return false;
		}
	}
}

