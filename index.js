const electron = require('electron');
const magister_tools = require('magister-tools');
const {app, BrowserWindow} = electron;
const {ipcMain, session} = require('electron'); 

app.on('ready', () => {
    
    // Window
    let window = new BrowserWindow({
        width: 560,
        height: 380,
        icon: __dirname + '/icon.png'
    })
    
    window.setMenu(null);
    window.setResizable(true);
    window.setMaximizable(false);
    window.setMinimumSize(560, 380);
    window.setMaximumSize(560, 380);

    window.loadURL(`file://${__dirname}/index.html`);
    session.defaultSession.cookies.remove('http://localhost', 'loginCredentials', (error) => {});

    window.webContents.on('dom-ready', function (e) {
        session.defaultSession.cookies.get({}, (error, cookies) => {
            
            for (var i = 0;i < cookies.length;i++) {
                if (cookies[i].name == "studentNumber") {
                    session.defaultSession.cookies.get({name: 'studentNumber'}, (error, cookies) => {
                        if (cookies[0].value != '') {
                            window.webContents.executeJavaScript(`
                                document.getElementById('studentNumber').value = ` + cookies[0].value + `;
                            `);
                        }
                    });
                }

                if (cookies[i].name == "password") {
                    session.defaultSession.cookies.get({name: 'password'}, (error, cookies) => {
                        if (cookies[0].value != '') {
                            window.webContents.executeJavaScript(`
                                document.getElementById('password').value = '` + cookies[0].value + `';
                            `);
                        }
                    });
                } 
                
                if (cookies[i].name == "school") {
                    session.defaultSession.cookies.get({name: 'school'}, (error, cookies) => {
                        if (cookies[0].value != '') {
                            window.webContents.executeJavaScript(`
                                setSchool('` + cookies[0].value + `');
                            `);
                        }
                    });
                }
            }
        });

        window.webContents.executeJavaScript(`
            var ipcRenderer = require('electron').ipcRenderer;

            document.getElementById('login').onclick = function() {
                var school;
                if (document.getElementById('school').getElementsByClassName('active')[0] != undefined)
                    school = document.getElementById('school').getElementsByClassName('active')[0].innerText;
                else 
                    school = "error";
                
                var studentNumber = document.getElementById('studentNumber').value;
                var password = document.getElementById('password').value;
                
                var studentInfo;
                
                if (school == "" || studentNumber == "" || password == "")
                    studentInfo = ["error", "error", "error"];
                else
                    studentInfo = [studentNumber, password, school];

                document.getElementById('login').classList.add('loading');
                ipcRenderer.send('studentInfo', studentInfo);
            };
        `);
    });

    ipcMain.on('studentInfo', function (event, value) {
        var studentNumber = value[0];
        var password = value[1];
        var school = value[2];

        // Setup Magister
        magister_tools.magisterLogin({
            school: school,
            username: studentNumber,
            password: password
        
        }, function (err, magisterlogin) {
            if (err || studentNumber == "error" || password == "error" || school == "error") {
                window.webContents.executeJavaScript(`
                    error();
                    document.getElementById('login').classList.remove('loading');
                `);
            } else {
                session.defaultSession.cookies.set({url: 'http://localhost', name: 'studentNumber', value: studentNumber, expirationDate: 9999999999999999}, (error) => {});
                session.defaultSession.cookies.set({url: 'http://localhost', name: 'password', value: password, expirationDate: 9999999999999999}, (error) => {});
                session.defaultSession.cookies.set({url: 'http://localhost', name: 'school', value: school, expirationDate: 9999999999999999}, (error) => {});

                magister_tools.fetchCurrentCourse(magisterlogin, function (err, course) {
                    if (err) console.log(err);
            
                    magister_tools.fetchGrades(course, function (err, gradesInfo) {
                        if (err) console.log(err);
    
                        var grades = [];
    
                        for (var i = 0;i < gradesInfo.length;i++) {
                            if (gradesInfo[i]._type._type == 1) {
    
                                // Descriptions
                                var description = "";
                                
                                switch (gradesInfo[i]._class.abbreviation) {
                                    case "anw":
                                        description = "Algemene Natuurwetenschappen";
                                        break;
                                    case "in":
                                        description = "Informatica";
                                        break;
                                    case "ges":
                                        description = "Geschiedenis";
                                        break;
                                    case "kubv":
                                        description = "Kunst & beeldende vorming";
                                        break;
                                    case "maat":
                                        description = "Maatschappijleer";
                                        break;
                                    case "wisA":
                                        description = "Wiskunde A";
                                        break;  
                                    case "wisB":
                                        description = "Wiskunde B";
                                        break;
                                    case "wisC":
                                        description = "Wiskunde C";
                                        break;
                                    case "wisD":
                                        description = "Wiskunde D";
                                        break;
                                    case "nat":
                                        description = "Natuurkunde";
                                        break;         
                                    case "netl":
                                        description = "Nederlands";
                                        break;
                                    case "entl":
                                        description = "Engels";
                                        break;
                                    case "fatl":
                                        description = "Frans";
                                        break;
                                    case "dutl":
                                        description = "Duits";
                                        break;
                                    case "go":
                                        description = "Godsdienst";
                                        break;
                                    case "econ":
                                        description = "Economie";
                                        break;
                                    case "schk":
                                        description = "Scheikunde";
                                        break;
                                    case "ckv":
                                        description = "Culturele & kunstzinnige vorming";
                                        break;
                                    case "lo":
                                        description = "Lichamelijke opvoeding";
                                        break;
                                    case "mnt":
                                        description = "Mentoruur";
                                        break;
                                    case "kumu":
                                        description = "Muziek";
                                        break;
                                    default:
                                        description = gradesInfo[i]._class.description;
                                }

                                if (!gradesInfo[i]._type._isPTA)
                                    grades.push([description, gradesInfo[i]._grade, gradesInfo[i]._weight]);
                            }
                        }
    
                        window.loadURL(`file://${__dirname}/calculation.html`);
                        
                        window.webContents.on('did-finish-load', () => {
                            window.webContents.send('grades', grades)
                        });
    
                        window.webContents.on('dom-ready', function (e) {
                            window.webContents.executeJavaScript(`
                                var subjects = document.getElementById('subjects');
    
                                var grades = [];
                                
                                require('electron').ipcRenderer.on('grades', (event, arr) => {
                                    grades = arr.slice();
                                    document.getElementById('subjects').innerHTML = "";
    
                                    var check = [];
    
                                    for (var i = 0;i < grades.length;i++) {
                                        if (check.indexOf(grades[i][0]) == -1) {
                                            check.push(grades[i][0]);
                                            var option = document.createElement("div");
    
                                            option.className = "item";
                                            option.textContent = grades[i][0];
                                            option.setAttribute("data-value", grades[i][0]);
                                            //option.value = grades[i][0];
                                            subjects.appendChild(option);
                                        }
                                    }
                                });
    
                                document.getElementById('calculate').onclick = function() {
                                    var clickedSubject = document.getElementById('subjects').getElementsByClassName('active')[0].innerText;
    
                                    var clGrades = [];
                                    var clWeights = [];
    
                                    for (var i = 0;i < grades.length;i++) {
                                        if (grades[i][0] == clickedSubject) {
                                            clGrades.push(grades[i][1]);
                                            clWeights.push(grades[i][2]);
                                        }
                                    }
    
                                    var weight = document.getElementById("weight").value;
    
                                    nextGradeMinimum(clGrades, clickedSubject, weight, clWeights);
                                }
    
                                // Calculate grade
                                function nextGradeMinimum(grades, subject, weight, weights) {
                                    var gradeSum = 0.0;
                                    var weightSum = 0.0;
    
                                    var gradesClear = [];
                                    var weightsClear = [];
    
                                    for (i = 0;i < grades.length;i++) {
                                        weightsClear.push(parseInt(weights[i]));
                                        gradesClear.push(parseFloat(grades[i].replace(",",".")));
    
                                        gradeSum += gradesClear[i] * weightsClear[i];
                                        weightSum += weightsClear[i];
                                    }
    
                                    weightSum += parseInt(weight);
    
                                    var nextGrade = (weightSum * 5.5 - gradeSum) / parseFloat(weight);
                                    
                                    if (nextGrade < 1.0) 
                                        nextGrade = 1.0;
    
                                    document.getElementById('grade').innerHTML = nextGrade.toFixed(1);
                                }
                            `);
                        });
                    })
                })
            }
        });


    });

})