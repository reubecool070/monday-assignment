## Overview

This is the "Quickstart Integration" example Monday app.
<br>It can be used as a board recipe, which transforms data from one text column to another

<br>This app demonstrates how to use the:

- integration recipe
- custom action
- call authentication with JWT
- query monday API using short lived token (seamless authentication)
- remote options for custom fields
- MongoDB for storing calculation history

<br>You can follow along in our [Quickstart guide](https://developer.monday.com/apps/docs/quickstart-integration) or use the instructions below.
<br>![Screenshot](https://dapulse-res.cloudinary.com/image/upload/v1658942490/remote_mondaycom_static/developers/screenshots/QUICKSTART_GIPHY.gif)

## Install

1. Make sure you have Node (v16.16+), npm, and MongoDB installed

2. Install the dependencies:

```
$ npm install
```

3. Make sure MongoDB is running on your system or provide a connection string in the `.env` file

## Configure your Monday App

### Part One: Create a new app and integration feature

1. Open monday.com, login to your account and go to a "Developers" section.
2. Create new app - name it "Integration Example App"
3. Open "Features" section and create new "Integration" feature
4. Choose the "Quickstart Integration - NodeJS" template to start. Add in the missing scopes, run the command scaffold in your command line, and paste the resulting URL into the URL box.

<br>![Screenshot](https://dapulse-res.cloudinary.com/image/upload/v1659026516/integration_template.gif)

### Part Two: Update your integration's basic information

In the feature editor, open the "Feature Details" tab. This tab allows you to add a title and description to your custom integration recipe. The user will see the title and description when they see your recipe in the Integrations Center.

<br>![Screenshot](https://dapulse-res.cloudinary.com/image/upload/v1659026704/ee5c6e5-Quickstart_1.png)

### Part Three: Recipe configuration

Our new feature templates provide the integration recipe for you, so it is ready to go.

<br>![Screenshot](https://dapulse-res.cloudinary.com/image/upload/v1659026804/ecd8711-Recipe.png)

This integration utilizes a custom action that calls our API to update a second text column. If you want to see the code behind this recipe, navigate into the "quickstart-integrations" folder downloaded onto your computer after you ran the command line prompt in Part 1.

In short, integrations run off of triggers that invoke certain actions. These triggers are the conditions that must be met before an action can take place.

## Part Four: Run the project

1. Add your MONDAY_SIGNING_SECRET to .env file
   <br> \*\* To get your MONDAY_SIGNING_SECRET go to monday.com, open Developers section, open your app and find the Signing Secret in "Basic Information" section
   <br> ![Screenshot](https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/uploads/VladMystetskyi/4db4f03e-67a5-482d-893e-033db67ee09b_monday-Apps2020-05-1901-31-26.png)
2. Run the server using the monday tunnel:

```
$ npm run dev
```

### Part Five: Using the custom integration recipe

You're done! Head to any of your boards to add the integration recipe by searching for its name (in this example the integration name is "New Feature").

Follow the integration recipe prompts as normal (selecting which Text columns you want) and watch the magic unfold!

## Calculation History with MongoDB

This integration now includes a calculation history feature that logs all calculations to a MongoDB database. This allows users to view a history of past calculations.

### Setting up MongoDB

1. Install MongoDB on your local machine or use a cloud MongoDB provider
2. Set your MongoDB connection string in the `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/monday-calculations
   ```

### Accessing Calculation History

The integration provides several API endpoints to access calculation history:

- `GET /monday/calculations` - Get all calculation history with pagination
- `GET /monday/board/:boardId/calculations` - Get calculation history for a specific board
- `GET /monday/item/:itemId/calculations` - Get calculation history for a specific item

These endpoints can be used to display calculation history in the Monday.com UI using a custom app.
