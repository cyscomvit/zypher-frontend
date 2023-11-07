import { MOUSE_VALUES } from "./Input.js";
import { setPaused, setUnpaused } from "./UI.js";
import { loadScene } from "./init.js";
import { message, input, fatal } from "./alert.js";
import { getQuestion, getUserData, postAnswer } from "../../api.js";

export const genericChecks = async (raw, action = "communicating with the server") => {
    if (!raw.ok) {
        if (raw.status === 401) {
            await message({ text: "You seem to have been logged out. Please log in again." });
            window.location.href = "../login/";
        } else {
            await fatal({
                text: `There was an error ${action}. Please reload the page and try again.`,
            });
        }
    }
};

export const Game = {
    tileSize: 32,
    canvas: {},
    ctx: {},
    Input: {
        handler: function () {
            if (Game.Input.isKeyDown("d")) {
                Game.Player.vel.x += Game.moveVel;
            }
            if (Game.Input.isKeyDown("a")) {
                Game.Player.vel.x -= Game.moveVel;
            }
            if (Game.Input.isKeyDown("w")) {
                if (!Game.Player.jumping && Game.Player.grounded) {
                    Game.Player.jumping = true;
                    Game.Player.grounded = false;
                    Game.Player.vel.y = -Game.jumpVel;
                }
            }
        },

        rightMouseClicked: false,
        mouseUpHandler: function (e) {
            if (e.button === MOUSE_VALUES.RIGHT) {
                Game.Input.rightMouseClicked = false;
            }
        },
        mouseDownHandler: function (e, assets) {
            // Audio.playSFX(assets.getAsset('clickSFX.mp3'))
            if (e.button === MOUSE_VALUES.RIGHT) {
                Game.Input.rightMouseClicked = true;
            } else if (e.button === MOUSE_VALUES.LEFT) {
                if (Game.Input.rightMouseClicked) {
                    // handle left + right clicked at the same time
                } else {
                    // handle left click
                }
            }
        },
        keyDownHandler: function (e) {
            Game.pressedKeys[e.key] = true;
        },
        keyUpHandler: async function (e) {
            Game.pressedKeys[e.key] = false;
            if (e.key === "e" && !Game.paused && Game.Player.trigger) {
                const cause = Game.Player.triggerParent;
                console.log("cause is:", cause)
                if (cause.spriteName === "chest") {
                   



                    console.log("user data:", Game.userData.answered_levels, "cause data:", cause.misc.level);
                    const levelNumber = parseInt(cause.misc.level, 10);
                    let new_levels = []
                    const singleDigitRegex = /^\d$/;
                    const doubleDigitRegex = /^\d{2}$/;
                    for(let i=1;i<Game.userData.answered_levels.length;i++){
                        if(doubleDigitRegex.test(Game.userData.answered_levels[i] + Game.userData.answered_levels[i+1])){
                            new_levels.push(parseInt(Game.userData.answered_levels[i] + Game.userData.answered_levels[i+1]))
                            i++;
                        }
                        else if(singleDigitRegex.test(Game.userData.answered_levels[i])){
                            new_levels.push(parseInt(Game.userData.answered_levels[i]))
                        }

                        // new_levels.push(parseInt(Game.userData.answered_levels[i]))
                    }
                    console.log("Parsed cause level:", levelNumber);
                    console.log("Answered levels:", new_levels);
                    console.log("Type of Game.userData.answered_levels[0]:", typeof Game.userData.answered_levels[0]);

                    console.log("Is level included:", new_levels.includes(levelNumber));
                    if (!new_levels.includes(levelNumber)){
                        console.log("Launching question for level:", levelNumber);
                        await Game.actions["launch-question"](levelNumber);
                    }


                   
                    if (cause.misc.scene == Game.userData.scene_reached)
                        
                        await Game.actions[Game.Player.trigger](cause.misc.level);
                    // if the user didnt complete the previous level, he will get this error
                    // so for us, if the user didnt complete the previous scene and goes to next scene, he should get this error
                    if (cause.misc.scene > Game.userData.scene_reached) {
                        await message({ text: "You haven't reached that level yet." });
                        return;
                    }
                } else {
                    await Game.actions[Game.Player.trigger]();
                }
            }
            if (e.key === "Escape") {
                Game.paused ? Game.setPause(false) : Game.setPause(true);
            }
        },
        isKeyDown: function (k) {
            return Game.pressedKeys[k];
        },
    },
    Config: {},
    scale: {
        x: 0.62,
        y: 0.62,
    },
    UI: {
        setMaskOpacity: function (s) {
            Game.UI.mask.style.display = "initial";
            Game.UI.mask.style.opacity = "" + s;
        },

        pauseHeading: "PAUSED",
        pauseSubtext: "press Escape to resume",

        hideMask: function () {
            Game.UI.setMaskOpacity(0);
            Game.UI.maskHeader.innerHTML = "";
            Game.UI.maskSubtext.innerHTML = "";
            Game.UI.mask.style.display = "none";
        },

        setMaskContents: function (opacity, heading, description) {
            Game.UI.setMaskOpacity(opacity);
            Game.UI.mask.style.display = "initial";
            Game.UI.maskHeader.innerHTML = heading;
            Game.UI.maskSubtext.innerHTML = description;
        },

        hideTextBox: function () {
            if (!Game.UI.textBox.hasMouseInside && !Game.Dialogue.dialogueActive) {
                Game.UI.textBox.style.display = "none";
                return;
            }
            Game.UI.closeDialogue();
        },

        showTextBox: function () {
            Game.UI.textBox.style.display = "unset";
        },

        setNPCName: function (s) {
            Game.UI.npcName.innerHTML = s;
        },

        setDialogueText: function (s) {
            Game.UI.dialogueBox.innerHTML = s;
        },

        dialogueFadeTime: 3000,

        closeDialogue: function () {
            setTimeout(Game.UI.hideTextBox, Game.UI.dialogueFadeTime);
        },
    },
    Player: {},
    Scene: {},
    entities: [],
    jumpVel: 15,
    moveVel: 0.5,
    friction: 0.2,
    gravity: {
        x: 0,
        y: 0.5,
    },
    maxVel: {
        x: 4,
        y: 100,
    },
    actions: {
        level1: async () => {
            await loadScene("scene1");
        },
        level2: async () => {
            Game.userData = await getUserData();
            console.log(Game.userData.scene_reached)
            if (Game.userData.scene_reached > 1) await loadScene("scene2");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        level3: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached > 2) await loadScene("scene3");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        level4: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached > 3) await loadScene("scene4");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        level5: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached > 4) await loadScene("scene5");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        level6: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached > 5) await loadScene("scene6");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        level7: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached > 6) await loadScene("scene7");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        level8: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached > 7) await loadScene("scene8");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        level9: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached > 8) await loadScene("scene9");
            else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        gameends: async () => {
            Game.userData = await getUserData();
            if (Game.userData.scene_reached === 10) {
                Game.setPause(true);
                await message({
                    title: "Congratulations! You have completed Zypher! For climbing up the leaderboard, consider solving the remaining challenges.",
                    text: "Frantically collecting all the incriminating evidence on his drive, F0X3R heard the steel gates rumble once more. Panic surged through him as he realized they had been tipped off. Barely escaping the closing gates, Ryan fled for his life. Two weeks later- The headlines in a remote bar in Mannar blared, 'German Hacker Erdenfeld Fox Assassinated in a Colombo Hotel.' Meanwhile, Ryan sat in silence, sipping his coffee by the window, finally at peace, and whispered to himself, 'Now rest in peace, Mother.'",
                    safeBody: false,
                });
            } else
                await message({
                    text: "You must conquer the current challenge before venturing further. Face this daunting trial and emerge victorious to unlock new realms. Your destiny eagerly awaits your triumph!",
                });
        },
        "launch-question": async (question_level) => {
            Game.setPause(true);
            console.log("Question Level:", question_level)
            let level, text, url, points, correct, error, raw; // hack for reusing variable names
            ({ level, text, url, points, raw } = await getQuestion(question_level));
            await genericChecks(raw);

            const answer = await input({ text: `Level ${level}: ${text}`, url: url, points }).catch(
                noop => noop
            );
            ({ correct, raw, error } = await postAnswer(answer, question_level));
            await genericChecks(raw, "submitting your answer");

            if (error) {
                if (level === 1) {
                    await message({
                        title: "Notice",
                        text: "The game hasn't started yet, but we love the enthusiasm!",
                    });
                } else {
                    // await message({
                    //     title: "Nearly there...",
                    //     text: "The door awaits",
                    // });
                }
            } else {
                await message({
                    text: correct
                        ? "Correct answer! The next level has been unlocked."
                        : "Sorry, try again ...",
                });
            }

            const data = await getUserData();
            await genericChecks(data.raw);
            Game.userData = data;
            Game.setPause(false);
        },
        "displayDesc1": async () => {
            await message({
                text: "As F0X3R scoured through the confidential files of Erden LTD, the arch-nemesis of Harper Corp, exploiting the only zero-day vulnerability he had uncovered within their organization, a sudden and unexpected pop-up message flashed on his screen for a mere split second. 'Hello, Ryan Fox. To what do we owe this unexpected pleasure? What's a skilled white-hat hacker, residing in Munich and masquerading as an ordinary software developer at Harper Corp, doing poking around here? When you can do so much better…' Intrigued, F0X3R couldn't believe his eyes; he initially blamed it on the clock. It was just a fleeting moment, but the mystery lingered. He couldn't ignore it. That's when he stumbled upon a peculiar folder named 'Z-Project.' Solve the challenge to find out the contents",
            });
        },
        "displayDesc2": async () => {
            await message({
                text: "A triumphant grin spread across F0X3R's face as he secured root access to Erden LTD's systems. Yet, a text file from the enigmatic 'Z-Project' gave him pause. It contained an encrypted ciphertext hidden in plain sight, only to be deciphered as coordinates: 51.2025° N, 13.1592° E. In an instant, F0X3R's mind raced, realizing that these coordinates pointed to nowhere else but Ostrau, where he had spent his formative years and where his mother had taken her last breath. The weight of this discovery propelled him to book a flight to Ostrau without hesitation. Upon entering his old apartment, he sensed an eerie difference. His one-room dwelling now held only a monitor on a table and a bottle of water. The monitor abruptly flashed 'HELLO F0X3R,' and he was logged into his own email account. Automated steel gates clanged shut behind him, sealing his fate.",
            });
        },
        "displayDesc3": async () => {
            await message({
                text: "'Welcome to the Zypher Quest,' echoed in the mysterious message. Countless hackers, have one hope, one goal, one mission and one ambition to pass this test",
            });
        },
        "displayDesc4": async () => {
            await message({
                text: "With each step, F0X3R felt closer to his destiny. 'Fox, you are one step closer to your brightest future. Keep your spirits high, for Z demands excellence, and those who fall short pay the price.' he muttered, beginning to grasp the gravity of his involvement. 'They called me Fox. They know everything,'",
            });
        },
        "displayDesc5": async () => {
            await message({
                text: "With determination in his eyes, F0X3R received a stark warning, 'Do not falter here. Do not let down the millions who await this opportunity. Do not let down Z0d.'",
            });
        },
        "displayDesc6": async () => {
            await message({
                text: "The final email from the Zypher Quest appeared. 'Unravel the challenges to test your prowess,' it instructed, setting the stage for the climax.",
            });
        },
        "displayDesc7": async () => {
            await message({
                text: "The imposing steel gates rumbled open, revealing the next chapter of F0X3R's journey. 'Welcome to Z0D1AC, Ryan Fox,' the message declared. 'You are recruited. Z0D1AC seeks to employ the brightest minds in the hacking world for a divine purpose – the purpose of global domination and the elimination of any weak links. You, Fox, are chosen for this purpose. Do not disappoint us.'",
            });
        },
        "displayDesc8": async () => {
            await message({
                text: "As F0X3R stumbled upon a photograph of himself and his mother from the fateful night she was brutally killed, the shock and realization hit him like a tidal wave. 'Z0D1AC killed my mother?! Z0D1AC killed my mother!!!' A tear rolled down his cheek as he began to uncover the haunting truth behind her death.",
            });
        },
        "displayDesc9": async () => {
            await message({
                text: "Fueled by the revelation of Z0D1AC's sinister involvement, Ryan traced the dark threads back to Russia's flag and damning logs. 'Russia hired Z0D1AC to wage a cyberwar against Ukraine,' he concluded. Further investigation revealed an NFT and a vulnerable IP address owned by none other than Erdenfeld Fox, his stepfather. The man he thought was dead had been alive all along.",
            });
        },

    },
    setPause: function (bool) {
        Game.paused = bool;
        bool ? setPaused() : setUnpaused();
    },
    blurHandler: function () {
        Game.pressedKeys = {};
        Game.wasPausedBeforeBlur = Game.paused;
        Game.setPause(true);
    },
    focusHandler: function () {
        if (Game.wasPausedBeforeBlur) {
            Game.setPause(true);
        } else {
            Game.setPause(false);
        }
    },
    pressedKeys: {},
};

window.game = Game;

export const mouse = {
    x: 0,
    y: 0,
};
