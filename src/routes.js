const puppeteer = require('puppeteer')
const Twitter = require('./twitter/twitter')
const DevicesProfiles = require('./devices.profiles')
const ConditionsUtil = require('./helpers/conditions-util')
const ApiService = require('./services/api.service')

const headless = true; // set to false for visual mode
const apiService = new ApiService();
const sessions = [];

/**
 * Run web app for Twitter API
 *
 * @param app
 */
const appRouter = function (app) {
    const isAuth = (request, response) => {
        const auth = request.header("authorization");

        if (!ConditionsUtil.isNullOrEmpty(auth)) {
            const key = auth.replace('Bearer ', '')

            return apiService.isKeyValid(key)
        } else {
            return false
        }
    }

    const restricted = (request, response) => {
        if (!isAuth(request, response)) {
            return response.status(401).send({
                status: 401,
                name: 'Unauthorized',
                message: 'Authorization Required'
            })
        }
    }

    const loadSession = async (authorization, browser) => {
        const key = authorization.replace('Bearer ', '')

        if (ConditionsUtil.isNullOrEmpty(sessions[key])) {
            const session = {}
            session.context = await browser.createIncognitoBrowserContext()
            session.page = await session.context.newPage()
            session.page.emulate(DevicesProfiles.desktop)
            session.twitter = {
                core: await new Twitter(session.page),
            }
            session.twitter.user = session.twitter.core.user()
            session.twitter.directMessaging = session.twitter.core.directMessaging()

            sessions[key] = session
        }

        return sessions[key]
    }

    puppeteer.launch({headless: headless, timeout: 0}).then(async browser => {

        app.get('/', function (req, res) {
            const authStatus = isAuth(req, res)
            console.log(authStatus)

            res.send({
                name: 'NodeJS Twitter API',
                scope: ['twitter-api'],
                auth: authStatus
            })
        })

        app.get('/api/register', function (req, res) {
            res.send({
                scope: ['twitter-api'],
                key: apiService.createKey()
            })
        })

        app.post('/follow/:username', async function(request, response) {
            restricted(request, response)
            const context = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await context.twitter.user.follow(request.params.username))
            }
        })

        app.post('/unfollow/:username', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.unfollow(request.params.username))
            }
        })

        app.post('/tweet', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.body.text) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: text'})
            } else {
                return response.wrap(await session.twitter.user.tweet(request.body.text))
            }
        })

        app.post('/like-recent-tweets/:username', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.likeRecentTweets(request.params.username))
            }
        })

        app.post('/like-tweet/:username/status/:id', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username || !request.params.id) {
                return response.wrap({'status': 'error', 'message': 'missing a parameters: username or status id'})
            } else {
                return response.wrap(await session.twitter.user.like(request.params.username, request.params.id))
            }
        })

        app.post('/like-last-tweet/:username', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.likeLastTweet(request.params.username))
            }
        })

        app.post('/follow-network/:username', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.followNetwork(request.params.username))
            }
        })

        app.post('/follow-interests/:username', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.followInterests(request.params.username))
            }
        })

        app.get('/:username/followers', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.followers(request.params.username))
            }
        })

        app.get('/followers', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!session.twitter.user.data.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.followers())
            }
        })

        app.get('/:username/interests', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.interests(request.params.username))
            }
        })

        app.get('/interests', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!session.twitter.user.data.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.interests())
            }
        })

        app.post('/retweet/:username/status/:id', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username || !request.params.id) {
                return response.wrap({'status': 'error', 'message': 'missing a parameters: username or status id'})
            } else {
                return response.wrap(await session.twitter.user.retweet(request.params.username, request.params.id))
            }
        })

        app.post('/retweet-last/:username', async function(request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.params.username) {
                return response.wrap({'status': 'error', 'message': 'missing a parameter: username'})
            } else {
                return response.wrap(await session.twitter.user.retweetLastTweet(request.params.username))
            }
        })

        app.post('/login', async function (request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            if(!request.body.username || !request.body.password) {
                return response.wrap({'status': 'error', 'message': 'missing a parameters: username or password'})
            } else {
                return response.wrap(await session.twitter.core.login(request.body.username, request.body.password))
            }
        })

        app.get('/logout', async function (request, response) {
            restricted(request, response)
            const session = await loadSession(
                request.header("authorization"),
                browser
            )

            return response.wrap(await session.twitter.core.logout())
        })

        app.response.wrap = function (data) {
            return this.send({data: data})
        }
    })
}

module.exports = appRouter