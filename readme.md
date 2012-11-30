socketio-chat-sb
================

Socket.io chat app using ServiceBus for scale out

This app is a fork of the socket.io sample chat app located at https://github.com/LearnBoost/socket.io. It demonstrates how to scall out socket.io instances using Windows Azure ServiceBus.

To use this app you need to do the following

* Clone the app (obivously)
* Create a ServiceBus namesapce in the Windows Azure portal, or use an existing namespace.
* Modify settings.json and put your sb namespace and key.
* Create 3 topics within the namespace in the Azure portal: usermessage, announcement, nicknames

You can then deploy the app across multiple instances and the chats will be synchonized across instances. For example you can deploy the app to the cloud and run it on your local workstation.