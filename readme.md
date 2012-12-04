socketio-chat-sb
================
Socket.io chat app using ServiceBus for scale out

This app is a fork of the socket.io sample chat app located at https://github.com/LearnBoost/socket.io. It demonstrates how to scale out socket.io instances using Windows Azure ServiceBus.

To use this app you need to do the following

* Clone the app (obivously)
* Create a ServiceBus namespace in the Windows Azure portal website or use an existing namespace. Copy the access key for the namespace.
* Deploy your app
* Set ServiceBus namespace config in the portal by adding SERVICEBUS_NAMESPACE and SERVICEBUS_ACCESS_KEY in the AppSettings section or use either our our xPlat CLI:

```
azure site config add 'SERVICEBUS_NAMESPACE=[namespace]' [site]
azure site config add 'SERVICEBUS_ACCESS_KEY=[accesskey]' [site]
```

or Powershell

```
$site = Get-AzureWebsite [site]
$site.AppSettings["SERVICEBUS_NAMESPACE"]="[namespace]"
$site.AppSettings["SERVICEBUS_ACCESS_KEY"]="[accesskey]"
$site | Set-AzureWebsite
```

You can then deploy the app across multiple instances and the chats will be synchonized across instances. For example you can deploy the app to the cloud and run it on your local workstation.