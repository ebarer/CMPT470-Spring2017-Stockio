var sockets = require('./sockets.js');

module.exports = {
    
     getPortfolioUsers: function(models, request, response) {
        var userID = request.session.passport.user;
        var portfolioID = parseInt(request.params.portfolioId);

        models.Portfolio.findById(portfolioID).then((portfolio) => {
            portfolio.getUsers().then((users) => {
                var currentUser = users.find((u) => { return u.id === userID });
                if (currentUser !== undefined) {
                    users = users.map((user) => {
                        return {
                            'id': user.id,
                            'username': user.username,
                            'firstname': user.firstname,
                            'lastname': user.lastname,
                            'permission': user.Users_Portfolios.permission
                        }
                    });

                    response.status(200).end(JSON.stringify({'users' : users}, null, 4));
                } else {
                    response.status(401).end(JSON.stringify({message: 'Unauthorized access to portfolio'}));
                }
            });
        });
    },

    addUserToPortfolio: function(io, models, request, response) {
        var userID = request.session.passport.user;
        var portfolioID = parseInt(request.params.portfolioId);
        var memberUsername = request.body.username;
        var memberPermission = request.body.permission;
        
        models.User.findById(userID).then((user) => {
            user.getPortfolios({where: {id: portfolioID}}).then((portfolio) => {
                portfolio = portfolio[0];
                if (portfolio !== undefined) {
                    var permission = portfolio.Users_Portfolios.permission;
                    if (permission === 'admin') {
                        models.User.findOne({
                            where: [{
                                username: memberUsername
                            }]
                        }).then((member) => {                            
                            if (member !== null) {                               
                                portfolio.addUser(member, { permission: memberPermission}).then(() => {                                    
                                    var portfolioData = {
                                        id: portfolio.id,
                                        name: portfolio.name,
                                        permission: memberPermission
                                    };
                                    
                                    models.Portfolio.findById(portfolioID, {include: [{ model: models.User}]
                                        }).then((newPortfolio) => {
                                            var memberID = member.id;
                                            io.to('user' + memberID).emit('addPortfolio', JSON.stringify(portfolioData))
                                            sockets.newPortfolio(memberID, portfolioID); // Make the new user listen for updates from now on.
                                            
                                            io.to('portfolio' + portfolioID).emit('updateMembers' + portfolioID, JSON.stringify(newPortfolio));
                                        });

                                    response.status(200).end(JSON.stringify({
                                        message: `Added member ${member.username}`,
                                        action: 'add'
                                    }, null, 4));
                                }).catch((err) => {
                                    console.log(err);
                                    response.status(401).end();
                                });
                            } else {
                                response.status(400).end(JSON.stringify({'message': `Member doesn't exist`}));
                            }
                        });
                    } else {
                        response.status(401).end(JSON.stringify({'message': 'User does not have permission to modify portfolio.'}));
                    }
                } else {
                    response.status(401).end(JSON.stringify({'message': 'Unauthorized access to portfolio.'}));
                }
            });
        });
    },
    
    deleteUserFromPortfolio: function(io, models, request, response) {
        var userID = request.session.passport.user;
        var portfolioID = parseInt(request.params.portfolioId);
        var memberID = request.body.memberID;

        models.User.findById(userID).then((user) => {
            user.getPortfolios({where: {id: portfolioID}}).then((portfolio) => {
                portfolio = portfolio[0];
                if (portfolio !== undefined) {
                    var permission = portfolio.Users_Portfolios.permission;
                    if (permission === 'admin') {
                        portfolio.removeUser(memberID).then(() => {
                            models.Portfolio.findById(portfolioID, {include: [{ model: models.User}]
                                }).then((portfolioInstance) => {
                                    io.to('user' + memberID).emit('deletePortfolio', JSON.stringify({'portfolioId': portfolioID}));
                                    io.to('portfolio' + portfolioID).emit('updateMembers' + portfolioID, JSON.stringify(portfolioInstance));
                                }); 

                            response.status(200).end(JSON.stringify({
                                message: `Removed member`,
                                action: 'delete'
                            }, null, 4));
                        });
                    } else {
                        response.status(401).end(JSON.stringify({'message': 'User does not have permission to modify portfolio.'}));
                    }
                } else {
                    response.status(401).end(JSON.stringify({'message': 'Unauthorized access to portfolio.'}));
                }
            });
        });
    }
}