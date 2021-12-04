class Lesson {
    constructor() {
        let pathParts = window.alloyLocation.pathname.split('/');

        this.assignmentId = pathParts[2];
        this.topicId = pathParts[4];
    
        API.getStudentCourseLesson(this.assignmentId, this.topicId, (err, response) => {
            this.lesson = response.data.lesson;

            this.renderQuestions();

            // Create step hash
            this.steps = {};            
            for(let step of this.lesson.steps) {
                this.steps[step.id] = step;
            }

            this.questionCount = this.getQuestionCount();

            let currentStep = this.getCurrentStep();
            currentStep.unlocked = true;

            this.selectStep(currentStep.id);                         
        });

        this.attachEventHandler('stepButton', 'mousedown', this.onMouseDownStepButton.bind(this));  
        this.attachEventHandler('question', 'mousedown', this.onMouseDownQuestion.bind(this));                
        this.attachEventHandler('choiceLetterCircle', 'mousedown', this.onMouseDownChoice.bind(this));

        this.moveNextButton = $('moveNextButton');
        this.moveNextButton.addEventListener('mousedown', this.onMouseDownMoveNextButton.bind(this));

        this.movePreviousButton = $('movePreviousButton');
        this.movePreviousButton.addEventListener('mousedown', this.onMouseDownMovePreviousButton.bind(this));

        
        //this.bookmarkButton = $('bookmarkButton');
        //this.bookmarkButton.addEventListener('mousedown', this.onMouseDownBookmarkButton.bind(this));  


        this.submitButton = $('submitButton');
        this.submitButton.style.display = 'none';
        this.submitButton.addEventListener('mousedown', this.onMouseDownSubmitButton.bind(this));   

        this.flagButton = $('flagButton');
        this.flagButton.style.display = 'none';
        this.flagButton.addEventListener('mousedown', this.onMouseDownFlagButton.bind(this));   

        this.nextButton = $('nextButton');
        this.nextButton.style.display = 'none';
        this.nextButton.addEventListener('mousedown', this.onMouseDownNextButton.bind(this));

        this.progressBarHeader = $('progressBarHeader');
        this.buttonBar = $('buttonBar');
    }  

    onMouseDownBookmarkButton(evt) {
        this.bookmarkDialog = new BookmarkDialog();

        this.bookmarkDialog.show(1, 2);
    }

    renderQuestions() {
        for(let step of this.lesson.steps) {
            if (step.question) {
                this.renderQuestion(step.question);
            }
        }
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }

    renderQuestion(question) {
        if (question.graphic) {
            let graphicDiv = $('question-' + question.id + '-graphic');            
            graphicDiv.style.display = 'block';
            graphicDiv.innerHTML = '<img id="questionGraphic" src="/graphics/q-' + question.id + '" />';
            
            let textDiv = $('question-' + question.id + '-text');
            textDiv.innerHTML = question.text;            
        } 
    }

    getCurrentStep() {
        for(let step of this.lesson.steps) {
            if (step.current) {
                return step;
            }
        }

        return this.lesson.steps[0];
    }

    attachEventHandler(classname, eventType, func) {
        let elts = document.getElementsByClassName(classname);       
        for(let elt of elts) {
            elt.addEventListener(eventType, func, false);
        }        
    }

    onMouseDownStepButton(evt) {
        this.checkForRedirect();

        let stepButton = Core.getEventSource(evt);
        let stepId = parseInt(stepButton.getAttribute('stepId'));

        this.selectStep(stepId);        
    }

    onMouseDownMovePreviousButton(evt){
        this.movePrevious();
    }    

    onMouseDownMoveNextButton(evt){
        this.moveNext();
    }

    onMouseDownFlagButton(evt) {
        let params;
        if (this.step.type === 'question') {
            params = {
                questionId: this.step.question.id,         
                assignmentId: this.assignmentId
            };
        } else {
            params = {
                topicId: this.topicId,         
                stepNumber: this.step.number,
                contentType: this.step.type        
            };
        }
    
        this.flagContentDialog = new FlagContentDialog();
        this.flagContentDialog.show(params);
    }

    onMouseDownNextButton(evt) {
        this.moveNext();
    }

    movePrevious() {
        if (this.step.number == 1) { return; }

        let stepIndex = this.step.number - 1;
        for(let i = (stepIndex - 1); i >= 0; i--) {
            let step = this.lesson.steps[i];
            if (step.visible) {
                this.selectStep(step.id);
                break;
            }
        }        
    }

    moveNext() {
        this.checkForRedirect();

        let stepIndex = this.step.number - 1;
        for(let i = (stepIndex + 1); i < this.lesson.steps.length; i++) {
            let step = this.lesson.steps[i];
            if (step.visible) {
                this.selectStep(step.id);
                break;
            }
        }
    }

    checkForRedirect() {
        if (this.lessonHalted) {
            window.alloyLocation.href = `/assignments/${this.assignmentId}/lessons/${this.topicId}/halted`;
        } else if (this.lessonComplete) {
            window.alloyLocation.href = `/assignments/${this.assignmentId}/lessons/${this.topicId}/completed`;
        }
    }

    updateProgressBar() {
        if (this.step.tutorial) {
            this.progressBarHeader.innerHTML = this.step.tutorial.title;
        } else if (this.step.example) {
            this.progressBarHeader.innerHTML = this.step.example.title;
        } else {
            this.progressBarHeader.innerHTML = this.step.question.exampleTitle;
        }

        for(let step of this.lesson.steps) {   
            let stepButton = $('stepButton-' + step.id);
            
            stepButton.style.display = step.visible ? 'block' : 'none';

            if (step.current) {
                stepButton.className = 'stepButton current'
            } else if (step.visited) {
                stepButton.className = 'stepButton visited';
            } else {
                stepButton.className = 'stepButton';
            }
        } 
    }

    selectStep(stepId) {
        let step = this.steps[stepId];

        if (step.unlocked && step !== this.step) {
            if (this.step) {
                this.step.current = false;
            }

            this.step = step;
            this.step.visited = true;
            this.step.current = true;

            if (this.step.question && !this.step.question.answer) {
                this.timerStart = new Date();
            }

            // Update which steps are visible and unlocked
            this.updateSteps();   

            API.selectLessonStep(this.assignmentId, this.topicId, this.step.id, (err, resposne) => { });

            if (this.stepDiv) {
                this.stepDiv.style.display = 'none';
            }

            this.stepDiv = $('step-' + this.step.id);
            this.stepDiv.style.display = 'block';
            this.stepDiv.appendChild(this.buttonBar);            

            window.scrollTo(0, 0);

            this.updateProgressBar();              
            this.updateMovePreviousButton();
            this.updateMoveNextButton();
            this.showHideExplanation();     
            this.updateSubmitButton(); 
            this.updateFlagButton();               
            this.updateNextButton();   
        }   
    }

    updateMovePreviousButton() {
        if (this.step.number === 1) {
            this.movePreviousButton.className = 'movePreviousButtonDisabled';        
        } else {
            this.movePreviousButton.className = 'movePreviousButtonEnabled';                  
        }
    }

    updateMoveNextButton() {    
        if (this.step.question && !this.step.question.answer) {
            this.moveNextButton.className = 'moveNextButtonDisabled';             
        } else {
            this.moveNextButton.className = 'moveNextButtonEnabled';
        }
    }

    showHideExplanation() {
        if (this.step.question && this.step.question.answer) {
            let explanationFrame = $('question-' + this.step.question.id + '-explanationFrame');
            explanationFrame.style.display = 'block';
        } 
    }

    updateSubmitButton() {
        if (this.step.question) {             
            if (!this.step.question.answer) {    
                this.submitButton.style.display = 'block';

                if (this.step.question.selectedChoice) {
                    this.enableSubmitButton();
                } else {
                    this.disableSubmitButton();
                }
            } else {
                this.submitButton.style.display = 'none';
            }
        } else {
            this.submitButton.style.display = 'none';
        }     
    }

    updateFlagButton() {
        if (this.step.question && !this.step.question.answer) {                    
            this.flagButton.style.display = 'none';  
        } else {
            this.flagButton.style.display = 'block';            
        }                      
    }

    updateNextButton() {
        if (this.step.question && !this.step.question.answer) {                    
            this.nextButton.style.display = 'none';  
        } else {
            this.nextButton.style.display = 'block';            
        }    
    }

    updateSteps() {
        // Initialize all steps to locked
        this.lesson.steps[0].unlocked = true;
        for(let i = 1; i < this.lesson.steps.length; i++) {
            this.lesson.steps[i].unlocked = false;
        }

        for(let i = 0; i < this.lesson.steps.length; i++) {   
            let currStep = this.lesson.steps[i];
            let nextStep = i < (this.lesson.steps.length - 1) ? this.lesson.steps[i + 1] : null;
            
            if (currStep.tutorial || currStep.example) {
                if (currStep.visited) {
                    if (nextStep) {
                        nextStep.unlocked = true;
                    } else {
                        this.lessonComplete = true;
                        break;
                    }
                } else {
                    break;
                }
            } else { // currStep.question
                if (nextStep) {
                    if (nextStep.question) { // This means we're at the first of the two questions
                        if (currStep.question.answer) {
                            if (!currStep.question.answer.correct) {
    
                                nextStep.unlocked = true;
                                nextStep.visible = true;
                            } else {
                                // Check that the "next next" step exists
                                if (i < (this.lesson.steps.length - 2)) {
                                    let nextNextStep = this.lesson.steps[i + 2];
                                    nextNextStep.unlocked = true;

                                    i++; // Skip to the next question
                                } else {                            
                                    this.lessonComplete = true;
                                    break;                           
                                }
                            }
                        } else {
                            break;
                        }
                    } else { // If we're here it means the current question is the second question and the next step is tutorial or example
    
                        if (currStep.question.answer) {
                            if (currStep.question.answer.correct) {
    
                                nextStep.unlocked = true;
                                nextStep.visible = true;                                               
                            } else {
                                this.lessonHalted = true;
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                } else { // If we're here, then we're at the final step and it's a question
                    
                    if (currStep.question.answer) {
                        if (currStep.question.answer.correct) {
                            this.lessonComplete = true;
                            break;
                        } else {
                            this.lessonHalted = true;
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
        }
    }

    getAnswerCount() {
        let questionCount = 0;
        for(let i = 0; i < this.lesson.steps.length; i++) {
            let step = this.lesson.steps[i];

            if (step.question && step.question.answer) {
                questionCount++;
            }
        }

        return questionCount;
    }

    getQuestionCount() {
        let questionCount = 0;
        for(let i = 0; i < this.lesson.steps.length; i++) {
            let step = this.lesson.steps[i];

            if (step.question) {
                questionCount++;

                if (step.question.answer && !step.question.answer.correct) {
                    questionCount++;
                }
                i++;
            }
        }

        return questionCount;
    }

    ///////////////////////////////////////////////////////////////////////////////
    // Choices

    onMouseDownQuestion(evt) {
        if (!this.step.question.answer) {
            this.unselectChoices();
        }
    }

    onMouseDownChoice(evt) {
        if (!this.step.question.answer) {

            this.unselectChoices();
            this.enableSubmitButton();

            let choice = Core.getEventSource(evt);
            let letter = choice.getAttribute('letter');

            this.selectChoice(letter);

            Core.killEvent(evt);
        }
    }

    selectChoice(letter) {
        let choiceId = 'question-' + this.step.question.id + '-choice' + letter.toUpperCase();
        let choice = $(choiceId);

        choice.style.background = 'rgb(64, 64, 64)';
        choice.style.color = 'white';

        this.step.question.selectedChoice = ['a', 'b', 'c', 'd', 'e'].indexOf(letter) + 1;

        this.enableSubmitButton();
    }

    unselectChoice(letter) {        
        let choiceId = 'question-' + this.step.question.id + '-choice' + letter.toUpperCase();
        let choice = $(choiceId);

        choice.style.background = null;
        choice.style.color = null;
    }    

    unselectChoices() {
        this.unselectChoice('A');
        this.unselectChoice('B');
        this.unselectChoice('C');
        this.unselectChoice('D');
        this.unselectChoice('E');   
        
        this.disableSubmitButton();

        this.step.question.selectedChoice = null;   
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Submit button

    enableSubmitButton() {
        this.submitButton.className = 'enabledButton';
    }

    disableSubmitButton() {
        this.submitButton.className = 'disabledButton';
    }

    onMouseDownSubmitButton(evt) {
        if (!this.step.question.answer && this.step.question.selectedChoice) {    

            this.submitButton.style.display = 'none';             

            const code = $('question-' + this.step.question.id).getAttribute('code');

            const timestamp = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            const utcTimestamp = moment.utc(timestamp).toDate();
            const localTimestamp = moment(utcTimestamp).local().format('YYYY-MM-DD HH:mm:ss');

            const data = {
                assignmentId: this.assignmentId,
                topicId: this.topicId, 
                questionId: this.step.question.id,
                code: code,
                selectedChoice: this.step.question.selectedChoice,
                timeElapsed: new Date() - this.timerStart,
                localTimestamp: localTimestamp                
            };

            this.step.question.answer = {
                submitted: true
            };

            API.submitLessonAnswer(this.assignmentId, this.topicId, data, (err, response) => {
                this.step.question.explanation = response.explanation;                
                this.step.question.answer = {
                    text: response.answer,
                    correct: response.correct
                };
                
                this.updateSteps();            
                this.updateProgressBar();
                this.updateFlagButton();
                this.updateMoveNextButton();                
                this.renderAnswerExplanation();
            });
        }
    }  

    renderAnswerExplanation() {
        this.renderAnswer();
        this.renderExplanation();

        this.nextButton.style.display = 'block';

        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }

    renderAnswer() {
        if (this.step.question.answer.correct) {
            $('question-' + this.step.question.id + '-answerCorrect').style.display = 'block';
        } else {
            $('question-' + this.step.question.id + '-answerIncorrect').style.display = 'block';
        }
    }

    renderExplanation() {
        $('question-' + this.step.question.id + '-explanation').innerHTML = this.step.question.explanation;
        $('question-' + this.step.question.id + '-explanationFrame').style.display = 'block';
    }
}

var lesson;

document.body.onload = function() {
    lesson = new Lesson(1);
};
