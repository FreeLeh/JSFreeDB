/*

From my understanding, the client authentication is done entirely on FE as they are using global state.
As such, client auth using OAuth2 done by the FE directly will NOT be supported here.

This file is kept until it's proven.
Current direction is to have 2 sheets wrappers, one for the BE and another for the FE.
There will be an internal wrapper too that uses the 2 wrappers for internal use cases.

There might be 2 types of stores (per store type): one for client JS and one for server JS.
This allows the "wrapper" creation to be abstracted from the end users.

*/