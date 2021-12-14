### NodeJS server with MongoDB and JWT tokens utilization

You can test authentication routes that specified down below [here](https://nodekpi.herokuapp.com/)

`POST /register, body: { email, username, password }`

`POST /login, body: { email, password }`

`GET /profile`

`POST /logout`

Authentication token is stored in cookies for demonstration purposes
so you don't need to pass it explicitly.
