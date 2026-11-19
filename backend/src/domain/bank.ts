// Static question bank for English and Verbal Reasoning topics (the "static curriculum").
// Admins can extend practice content by uploading PDFs; exams can be edited in the admin screen.
import type { Question } from './types.js';

type BankItem = Omit<Question, 'id' | 'topic' | 'type'> & { type?: Question['type'] };

const mcq = (prompt: string, options: string[], answer: string, explanation?: string): BankItem => ({ prompt, options, answer, explanation });

export const BANK: Record<string, BankItem[]> = {
  // ---------- English ----------
  'parts-of-speech': [
    mcq('Which word is a noun? "The happy dog ran quickly."', ['happy', 'dog', 'ran', 'quickly'], 'dog'),
    mcq('Which word is a verb? "Maya painted a bright picture."', ['Maya', 'painted', 'bright', 'picture'], 'painted'),
    mcq('Which word is an adjective? "The tall tree swayed gently."', ['tall', 'tree', 'swayed', 'gently'], 'tall'),
    mcq('Which word is an adverb? "She sang beautifully at the concert."', ['She', 'sang', 'beautifully', 'concert'], 'beautifully'),
    mcq('Which word is a pronoun? "They walked to the park together."', ['They', 'walked', 'park', 'together'], 'They'),
    mcq('Which word is a preposition? "The cat hid under the bed."', ['cat', 'hid', 'under', 'bed'], 'under'),
    mcq('Which word is a conjunction? "I wanted to play, but it was raining."', ['wanted', 'play', 'but', 'raining'], 'but'),
    mcq('What part of speech is "excitement"?', ['Noun', 'Verb', 'Adjective', 'Adverb'], 'Noun'),
  ],
  punctuation: [
    mcq('Which sentence is punctuated correctly?', ['Its raining today.', "It's raining today.", "Its' raining today.", 'It,s raining today.'], "It's raining today."),
    mcq('Which sentence uses commas correctly?', ['I bought apples, bananas, and grapes.', 'I bought, apples bananas and grapes.', 'I bought apples bananas, and, grapes.', 'I, bought apples bananas and grapes.'], 'I bought apples, bananas, and grapes.'),
    mcq('Which is the correct possessive for one girl owning a bag?', ["the girls' bag", "the girl's bag", 'the girls bag', "the girl,s bag"], "the girl's bag"),
    mcq('Which punctuation mark ends a question?', ['.', '!', '?', ','], '?'),
    mcq('Choose the correctly punctuated speech.', ['"Come here," said Mum.', '"Come here" said Mum.', 'Come here, "said Mum."', '"Come here, said Mum."'], '"Come here," said Mum.'),
    mcq("Which word needs an apostrophe? 'We cant go outside.'", ['We', 'cant', 'go', 'outside'], 'cant'),
    mcq('Which sentence uses a colon correctly?', ['You will need: a pencil, a ruler and an eraser.', 'You: will need a pencil.', 'You will: need a pencil.', 'You will need a: pencil.'], 'You will need: a pencil, a ruler and an eraser.'),
  ],
  tenses: [
    mcq('Choose the past tense: "Yesterday I ___ to school."', ['walk', 'walked', 'walking', 'will walk'], 'walked'),
    mcq('Choose the future tense: "Tomorrow we ___ the museum."', ['visited', 'visit', 'will visit', 'visiting'], 'will visit'),
    mcq('What is the past tense of "run"?', ['runned', 'ran', 'running', 'runs'], 'ran'),
    mcq('Which sentence is in the present continuous tense?', ['She reads a book.', 'She is reading a book.', 'She read a book.', 'She will read a book.'], 'She is reading a book.'),
    mcq('What is the past tense of "teach"?', ['teached', 'taught', 'teaching', 'teachs'], 'taught'),
    mcq('Choose the correct verb: "The children ___ playing outside."', ['is', 'was', 'are', 'be'], 'are'),
  ],
  vocabulary: [
    mcq('What does "enormous" mean?', ['tiny', 'very large', 'noisy', 'quick'], 'very large'),
    mcq('What does "fragile" mean?', ['strong', 'easily broken', 'heavy', 'colourful'], 'easily broken'),
    mcq('What does "reluctant" mean?', ['eager', 'unwilling', 'angry', 'tired'], 'unwilling'),
    mcq('What does "transparent" mean?', ['see-through', 'dark', 'shiny', 'rough'], 'see-through'),
    mcq('What does "ancient" mean?', ['modern', 'very old', 'broken', 'expensive'], 'very old'),
    mcq('What does "generous" mean?', ['selfish', 'willing to give', 'shy', 'rude'], 'willing to give'),
    mcq('What does "cautious" mean?', ['careful', 'careless', 'brave', 'loud'], 'careful'),
    mcq('What does "abundant" mean?', ['scarce', 'plentiful', 'empty', 'small'], 'plentiful'),
  ],
  spelling: [
    mcq('Which word is spelled correctly?', ['recieve', 'receive', 'receeve', 'riceive'], 'receive'),
    mcq('Which word is spelled correctly?', ['necessary', 'neccessary', 'necesary', 'nessecary'], 'necessary'),
    mcq('Which word is spelled correctly?', ['definately', 'definitely', 'defanitely', 'definitly'], 'definitely'),
    mcq('Which word is spelled correctly?', ['beleive', 'believe', 'belive', 'beleave'], 'believe'),
    mcq('Which word is spelled correctly?', ['separate', 'seperate', 'separete', 'seperete'], 'separate'),
    mcq('Which word is spelled correctly?', ['tommorow', 'tomorow', 'tomorrow', 'tommorrow'], 'tomorrow'),
  ],
  comprehension: [
    mcq('Read: "Lena packed her umbrella because the sky was grey and heavy." Why did Lena pack an umbrella?', ['She liked umbrellas', 'It looked like rain', 'It was sunny', 'Her friend asked her'], 'It looked like rain'),
    mcq('Read: "The bees buzzed from flower to flower, collecting nectar to make honey." What were the bees collecting?', ['Pollen only', 'Water', 'Nectar', 'Leaves'], 'Nectar'),
    mcq('Read: "After practising every evening for a month, Raj finally played the song perfectly." What helped Raj play perfectly?', ['Luck', 'Regular practice', 'A new piano', 'His teacher played for him'], 'Regular practice'),
    mcq('Read: "The old lighthouse stood alone on the cliff, its light guiding ships safely home." What is the purpose of the lighthouse?', ['To decorate the cliff', 'To guide ships', 'To house the keeper', 'To warn birds'], 'To guide ships'),
    mcq('Read: "Despite the long climb, the view from the mountain top made Sara forget how tired she was." How did Sara feel about the view?', ['Bored', 'Disappointed', 'Amazed', 'Scared'], 'Amazed'),
  ],
  'figurative-language': [
    mcq('"The classroom was a zoo." This is an example of a…', ['simile', 'metaphor', 'alliteration', 'onomatopoeia'], 'metaphor'),
    mcq('"She was as brave as a lion." This is an example of a…', ['simile', 'metaphor', 'personification', 'hyperbole'], 'simile'),
    mcq('"The wind whispered through the trees." This is an example of…', ['personification', 'simile', 'alliteration', 'idiom'], 'personification'),
    mcq('"I have told you a million times!" This is an example of…', ['hyperbole', 'simile', 'metaphor', 'onomatopoeia'], 'hyperbole'),
    mcq('"Peter Piper picked a peck of pickled peppers." This is an example of…', ['alliteration', 'metaphor', 'simile', 'hyperbole'], 'alliteration'),
    mcq('"Buzz", "bang" and "sizzle" are examples of…', ['onomatopoeia', 'personification', 'metaphor', 'idiom'], 'onomatopoeia'),
  ],
  'essay-writing': [
    { type: 'essay', prompt: 'Write about a time you learned something new. What was it, how did you learn it, and how did you feel afterwards?', minWords: 120, keywords: ['learn', 'learned', 'felt', 'practice', 'first', 'because', 'finally'] },
    { type: 'essay', prompt: 'Should students have homework every day? Give your opinion with at least two reasons.', minWords: 150, keywords: ['homework', 'because', 'reason', 'students', 'opinion', 'however', 'therefore'] },
    { type: 'essay', prompt: 'Describe your perfect weekend. Use the five senses to make your writing vivid.', minWords: 120, keywords: ['saw', 'heard', 'smell', 'taste', 'felt', 'weekend', 'morning'] },
    { type: 'essay', prompt: 'Explain why it is important to look after the environment, and suggest three things young people can do to help.', minWords: 150, keywords: ['environment', 'recycle', 'pollution', 'plastic', 'because', 'important', 'help'] },
    { type: 'essay', prompt: 'Write a story that begins with: "The door creaked open, and I could not believe what I saw…"', minWords: 150, keywords: ['door', 'suddenly', 'saw', 'then', 'finally', 'felt'] },
  ],

  // ---------- Verbal Reasoning ----------
  analogies: [
    mcq('Bird is to nest as bee is to…', ['flower', 'hive', 'honey', 'tree'], 'hive'),
    mcq('Hot is to cold as up is to…', ['high', 'down', 'over', 'top'], 'down'),
    mcq('Puppy is to dog as kitten is to…', ['mouse', 'cat', 'cub', 'pet'], 'cat'),
    mcq('Pen is to write as knife is to…', ['cut', 'fork', 'sharp', 'cook'], 'cut'),
    mcq('Doctor is to hospital as teacher is to…', ['book', 'school', 'student', 'lesson'], 'school'),
    mcq('Finger is to hand as toe is to…', ['leg', 'foot', 'nail', 'shoe'], 'foot'),
    mcq('Author is to book as composer is to…', ['piano', 'music', 'orchestra', 'song writer'], 'music'),
    mcq('Day is to night as summer is to…', ['spring', 'winter', 'sun', 'holiday'], 'winter'),
  ],
  'odd-one-out': [
    mcq('Which word is the odd one out?', ['apple', 'banana', 'carrot', 'mango'], 'carrot', 'Carrot is a vegetable; the others are fruits.'),
    mcq('Which word is the odd one out?', ['triangle', 'square', 'circle', 'cube'], 'cube', 'A cube is 3D; the others are flat shapes.'),
    mcq('Which word is the odd one out?', ['violin', 'guitar', 'drum', 'cello'], 'drum', 'A drum has no strings.'),
    mcq('Which word is the odd one out?', ['Mercury', 'Mars', 'Moon', 'Venus'], 'Moon', 'The Moon is not a planet.'),
    mcq('Which word is the odd one out?', ['whale', 'shark', 'dolphin', 'seal'], 'shark', 'A shark is a fish; the others are mammals.'),
    mcq('Which word is the odd one out?', ['happy', 'joyful', 'cheerful', 'gloomy'], 'gloomy'),
    mcq('Which word is the odd one out?', ['Paris', 'London', 'Italy', 'Tokyo'], 'Italy', 'Italy is a country; the others are cities.'),
  ],
  synonyms: [
    mcq('Which word means the same as "rapid"?', ['slow', 'fast', 'calm', 'late'], 'fast'),
    mcq('Which word means the same as "begin"?', ['end', 'start', 'stop', 'pause'], 'start'),
    mcq('Which word means the same as "difficult"?', ['easy', 'hard', 'soft', 'simple'], 'hard'),
    mcq('Which word means the same as "silent"?', ['quiet', 'loud', 'busy', 'bright'], 'quiet'),
    mcq('Which word means the same as "brave"?', ['fearful', 'courageous', 'weak', 'shy'], 'courageous'),
    mcq('Which word means the same as "huge"?', ['tiny', 'gigantic', 'narrow', 'short'], 'gigantic'),
    mcq('Which word means the same as "assist"?', ['help', 'hinder', 'ignore', 'leave'], 'help'),
  ],
  antonyms: [
    mcq('Which word means the opposite of "ancient"?', ['old', 'modern', 'historic', 'aged'], 'modern'),
    mcq('Which word means the opposite of "generous"?', ['kind', 'selfish', 'giving', 'friendly'], 'selfish'),
    mcq('Which word means the opposite of "victory"?', ['win', 'defeat', 'success', 'prize'], 'defeat'),
    mcq('Which word means the opposite of "expand"?', ['grow', 'shrink', 'stretch', 'widen'], 'shrink'),
    mcq('Which word means the opposite of "accept"?', ['receive', 'refuse', 'take', 'agree'], 'refuse'),
    mcq('Which word means the opposite of "rough"?', ['smooth', 'bumpy', 'coarse', 'hard'], 'smooth'),
    mcq('Which word means the opposite of "arrive"?', ['come', 'depart', 'reach', 'enter'], 'depart'),
  ],
  'word-classification': [
    mcq('Which group do these belong to: oak, pine, maple, birch?', ['flowers', 'trees', 'fruits', 'birds'], 'trees'),
    mcq('Which word fits with: sparrow, eagle, robin?', ['bat', 'owl', 'butterfly', 'squirrel'], 'owl'),
    mcq('Which word fits with: inch, metre, mile?', ['litre', 'kilogram', 'kilometre', 'hour'], 'kilometre'),
    mcq('Which word fits with: anger, joy, fear?', ['sadness', 'table', 'running', 'blue'], 'sadness'),
    mcq('Which word fits with: hammer, saw, screwdriver?', ['spoon', 'wrench', 'pillow', 'brush'], 'wrench'),
    mcq('Which word fits with: Nile, Amazon, Thames?', ['Everest', 'Ganges', 'Sahara', 'Pacific'], 'Ganges'),
  ],
};

export const hasBank = (topicId: string) => topicId in BANK;
