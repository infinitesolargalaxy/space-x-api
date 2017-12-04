Team Members (name and utorid):
 - Adam Fong (fongadam)
 - Andrew So (soandre2)
 - Yunsung Oh (ohyunsun)
 - Michael Ly (lymicha6)

The primary feature of our web application is to view SpaceX’s updated list of spacecraft or history of launches in an easy to use manner. The intention is to serve as a SpaceX fan site.

Our web application consists of five views: 

 1: A home landing page
 
 2-4: Three views which displays a list of vehicles, launches, or launchpads as cards. The list is drawn from SpaceX's API and is the default that is shown if the user is not logged in. If they are logged in, the list shown is their own personal copy of the data and they are free to modify it as they please.
 
 5: A login/signup page for existing users to log in or for new users to make an account with.

Users switch between these views using the tabs along the top. They can also navigate between views using the links in the cards which allows the user to see the relationship between vehicles, launches, and launchpads.
Specifically: 
 * A vehicle card is linked to its launches. 
 * A launch card is linked to its launched vehicle and which launchpad was used. 
 * A launchpad card is linked to the launches that took place on it.

Some of the features of our web application is its responsiveness to the user. With different screen sizes such as mobile phone or tablet, our navigation bar turns into a toggle mode or a full view. Also, the results display in the form of a card changes between a card in each row to 3 columns of cards in each row, providing better readability, and clicking space-x logo at the bottom directs to its homepage.
Our end-user would be someone who's a fan of SpaceX and they would use the web application to easily browse SpaceX's data on its launches, spacecraft, and historical launchpads, and add their own results to each list and having it be persistently stored and loaded from the server.

Through the browser, a logged in user can modify their collection. Some actions that can be performed are as follows:
 * They can get the entire list of vehicles, launches, or launchpads by pressing on their respective tab.
 * They can add new results to their collection by pressing the "plus" button on the side of the vehicles, launches, or launchpads views.
 * They can edit an existing result by pressing on the "pencil" button on any of the cards. They will be taken to a page with the card's value preloaded and any changes submitted are for that result.
 * They can delete an existing result by pressing on the "trash" button on any of the cards. The result they press the button on will be deleted from their collection.
 
Through the console, a user using their credentials can modify their collection. This is done through a curl request, and with attached JSON for POST and PUT.
The collection endpoints are: /vehicles, /launches, /launchpads
Individual objects can be obtained by specifying and id, then the endpoints are: /vehicles:id, /launches:id, /launchpads:id
 * They can perform a GET request on any of the collection endpoints to obtain the entire list.
	* They can get the information on a specific object by using an id.
 * They can perform a POST request to any of the collection endpoints. The user is required to provide some minimum amount of data for the request to be valid, this can be done by including that attribute.
	* A vehicle requires only a name for the spacecraft.
	* A launch requires the id and name of the rocket the launch describes as well as the id and name of the launchpad used.
	* A launchpad only requires the name of the pad.
 * They can perform a PUT request by specifying a collection and id. The specified object will be updated with the data if it is in a valid format.
    * They can also use the request to make an object with a specific id.
 * They can perform a DELETE request by specifying a collection and id. If the object exists, it will be deleted.
 
Finally, the messages from the admin are displayed at the top of each page in the browser and are updated every 5 seconds. 
The endpoints are: /messages for the entire list and /messages:id for a specific message.
 * Any user can use a GET request to obtain the messages posted.
 * The admin can perform a POST request to the collection endpoint to send a new message to all users of the application.
 * The admin can also perform a DELETE request to the collection with an id to delete a specific message.


