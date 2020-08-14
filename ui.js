$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome=$("#nav-welcome");
  const $navSubmit=$('#nav-submit');
  const $navFavorites=$('#nav-favorites');
  const $navMyStories=$('#nav-my-stories');
  const $favoritedArticles=$('#favorited-articles');
  const $myProfile=$('#user-profile');
  const $navEditProfile=$('#nav-edit-profile');
  const $editForm=$('#edit-form');
  

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    $('#nav-user-profile').text(username);
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    $('#nav-user-profile').text(username);
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });
  $('#nav-user-profile').on('click',function(){
    hideElements();
    showMyProfile();
  })
  /**
   * Create Own story Functionality
   */

  $navSubmit.on('click',function(){
    hideElements();
    $allStoriesList.show();
    $submitForm.show();
    $submitForm.on('submit',async function(evt){
      evt.preventDefault();
      const newStory={
        author:$('#author').val(),
        title:$('#title').val(),
        url:$('#url').val()
      }
      await storyList.addStory(currentUser,newStory)
      generateStories();
      $submitForm.hide();
      $submitForm.trigger("reset");
    })
  }) 
  /**
   * List Own story Functionality
   */
  
  $navMyStories.on('click',function(){
    hideElements();
    $ownStories.show();
    $ownStories.empty();
    if(!currentUser.ownStories.length===0){
      $ownStories.append("<h5>No stories added by User yet!</h5>");
    }
    for(let story of currentUser.ownStories){
      const result=generateStoryHTML(story,true);
      $ownStories.append(result);
      }
  });

  $ownStories.on('click',".trash-can",async function(evt){
    const $closestLi=$(evt.target).closest('li');
    const $storyId=$closestLi.attr("id");
    await storyList.removeStory(currentUser,$storyId);
    await generateStories();
    hideElements()
    $allStoriesList.show();
  })
  /**
   * List Favorites story Functionality
   */

  $navFavorites.on('click',function(){
    hideElements();
    
    $favoritedArticles.empty();
    if(currentUser.favorites.length===0){
      $favoritedArticles.append("<h5>No favorites added!</h5>");
    } else {
      for (let story of currentUser.favorites){
        const $result=generateStoryHTML(story);
        $favoritedArticles.append($result);
      }
    }
    $favoritedArticles.show();
  })
  /*
  *Choosing Favorite article by clicking star and change stars status.
  */

  async function toggleStoryFavorite(evt) {
  
    const $target = $(evt.target);
    const $closestLi = $target.closest("li");
    const storyId = $closestLi.attr("id");
    const story = storyList.stories.find(s => s.storyId === storyId);
  
    //checking if the item is already favorited
    if ($target.hasClass("fas")) {
      // if favorite: remove from fav list and toggle star
      await currentUser.removeFavorite(story);
      $target.closest("i").toggleClass("fas far");
      
    } else {
      // if not a favorite toggle star
      await currentUser.addFavorite(story);
      $target.closest("i").toggleClass("fas far");
    }
  }
  
  $allStoriesList.on("click", ".star", toggleStoryFavorite);
  
  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      $('#nav-user-profile').text(username);
      showNavForLoggedInUser();
      showMyProfile();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    showMyProfile();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }
  /* 
  *profile show section
  */

  function showMyProfile() {
    // show your name
    $("#profile-name").text(`Name: ${currentUser.name}`);
    // show your username
    $("#profile-username").text(`Username: ${currentUser.username}`);
    // format and display the account creation date
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    $myProfile.show();
  }
  /*
  *Edit the profile functionality
  */
  $navEditProfile.on('click',function(){
    hideElements();
    $('#edit-form').slideToggle();

  })
  $("#edit-form").on('submit',async function(evt){
    evt.preventDefault();
    const newUser={
      "username":$('#edit-username').val(),
      "password":$('#edit-password').val()
    }
    const userInstance = await User.editProfile(currentUser, newUser);
    // set the global user to the user instance
    currentUser = userInstance;
    $('#nav-user-profile').text($('#edit-username').val());
    syncCurrentUserToLocalStorage();
    editAndSubmitForm();
  })

  function editAndSubmitForm() {
    // hide the forms for logging in and signing up
    $('#edit-form').hide();

    // reset those forms
    $('#edit-form').trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    showMyProfile();
  }
  /*
  *put the trashcan Icon for the own stories to acces to delete
  */
  function getDeleteBtnHTML() {
    return `
        <span class="trash-can">
          <i class="fas fa-trash-alt"></i>
        </span>`;
  }
/*
  *put the star Icon for the stories to acces to make favorites
  */
  function getStarHTML(story, user) {
    const isFavorite = user.isFavorite(story);
    const starOption = isFavorite ? "fas" : "far";
    return `
        <span class="star">
          <i class="${starOption} fa-star"></i>
        </span>`;
  }
  
  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story,deleteButtonShow=false) {
    let hostName = getHostName(story.url);

    const showStar=Boolean(currentUser);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${deleteButtonShow ? getDeleteBtnHTML() : ""}
        ${showStar ? getStarHTML(story,currentUser) : ""}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoritedArticles,
      $editForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

/* show all elements releated logged in User  */

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navWelcome.show();
    $navSubmit.show();
    $navFavorites.show();
    $navMyStories.show();
    $navEditProfile.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }


});

