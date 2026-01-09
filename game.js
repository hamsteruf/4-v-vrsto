// Glavna igra
class ŠtiriVVrsto {
    constructor() {
        this.velikostPolja = 5;
        this.plošča = [];
        this.trenutniIgralec = 'o'; // 'o' ali 'x'
        this.zaprte = []; // Zapolnjena polja
        this.konecIgre = false;
        this.zgodovina = [];
        this.zmagovalnaPolja = [];
        this.kotAlfabete = 0;
        this.rezultati = { o: 0, x: 0 };
        this.racunalnikOmogočen = false;
        this.racunalnikIgralec = 'x';
        this.racunalnikTežavnost = 'težka'; // Vedno le najboljši algoritm
        this.racunalnikProtiRacunalniku = false;
        this.dinamičnaTežavnost = false;
        this.številoPotez = 0;
        this.zadrževanjePobede = 0;
        this.stareMeje = { minVrsta: 0, maxVrsta: 4, minStolpec: 0, maxStolpec: 4 };
        this.razlogZaRazširitev = null;
        this.globinaPredgleda = 3; // Vedno globina 3 za najboljši algoritm
        this.transposicijskaTabela = new Map();
        this.zgodovinaHevristike = {}; // Pamti česte dobre poteze
        this.ubijačnePoteze = {}; // Killer Move Heuristic - poteze koje su dobre u različitim granama
        this.simetrija = {}; // Memorija simetričnih pozicija
        this.vrednostiPolj = {}; // Vrednosti polja na osnovu sledećih 5 mogućih poteza
        
        this.inicializacijaPolja();
    }

    inicializacijaPolja() {
        this.plošča = Array(this.velikostPolja).fill(null).map(() => 
            Array(this.velikostPolja).fill(null)
        );
        this.zaprte = Array(this.velikostPolja).fill(null).map(() => 
            Array(this.velikostPolja).fill(false)
        );
        this.rišiPloščo();
    }

    izvediPotezo(vrsta, stolpec) {
        if (this.konecIgre || !this.jeVeljavnaPoteza(vrsta, stolpec)) return false;

        // Uporabi gravitacijo - polje pada navzdol
        vrsta = this.uporabiGravitacijo(vrsta, stolpec);
        if (vrsta === -1) return false; // Stolpec je poln

        // Štej poteze za naraščajočo težavnost
        this.številoPotez++;

        // Shrani v zgodovino
        this.zgodovina.push({
            plošča: this.plošča.map(r => [...r]),
            zaprte: this.zaprte.map(r => [...r]),
            igralec: this.trenutniIgralec,
            velikostPolja: this.velikostPolja,
            kotAlfabete: this.kotAlfabete,
            rezultati: { ...this.rezultati },
            zmagovalnaPolja: [...this.zmagovalnaPolja]
        });

        // Naredi potezo
        this.plošča[vrsta][stolpec] = this.trenutniIgralec;

        // Preveri zmago (če se ne nahajamo v zadrževalnem obdobju)
        let rezultatZmage = null;
        if (this.zadrževanjePobede > 0) {
            // V zadrževalnem obdobju - preveri zmago in prepreči jo
            rezultatZmage = this.preveriZmago(vrsta, stolpec);
            if (rezultatZmage) {
                // Odvzemi potezo - to ne sme biti dovolj
                this.plošča[vrsta][stolpec] = null;
                this.prikaziSporočilo(`Ta poteza bi dala zmago, kar ni dovoljeno! Poskusi drugače.`, 'napaka');
                this.zgodovina.pop(); // Odstrani iz zgodovine
                return false;
            }
            this.zadrževanjePobede--;
        } else {
            rezultatZmage = this.preveriZmago(vrsta, stolpec);
        }
        
        if (rezultatZmage) {
            this.zmagovalnaPolja = rezultatZmage.polja;
            this.rezultati[this.trenutniIgralec]++;
            
            // Zapolni zmagovalna polja
            rezultatZmage.polja.forEach(polje => {
                this.zaprte[polje.v][polje.s] = true;
            });
            
            this.prikaziSporočilo(`Igralec ${this.trenutniIgralec.toUpperCase()} dobil točko!`, 'zmaga');
            this.razlogZaRazširitev = 'zmaga';
            
            // Preveri ali je polje polno
            if (this.jePoljePolno()) {
                console.log('🏁 Polje je polno po zmagi - razširja se BREZ rotacije');
                setTimeout(() => this.razširiPolje(), 2000);
            } else {
                // Igra se nadaljuje
                this.trenutniIgralec = this.trenutniIgralec === 'o' ? 'x' : 'o';
                this.rišiPloščo();
                
                // AI poteza
                if (this.racunalnikOmogočen) {
                    if (this.racunalnikProtiRacunalniku) {
                        const zamik = 100;
                        setTimeout(() => this.izvediAIPotezo(), zamik);
                    } else if (this.trenutniIgralec === this.racunalnikIgralec) {
                        const zamik = 300;
                        setTimeout(() => this.izvediAIPotezo(), zamik);
                    }
                }
            }
            return true;
        }

        // Preveri izenačenje
        if (this.jePoljePolno()) {
            console.log('🔄 Polje je polno brez zmage - provjeravram da li je izenačenje');
            const jeIzenačenje = this.rezultati.o === this.rezultati.x;
            if (jeIzenačenje) {
                this.prikaziSporočilo('Izenačenje! Polje se razširja in obrne...', 'tie');
            } else {
                this.prikaziSporočilo('Polje je polno - razširja se!', 'tie');
            }
            this.razlogZaRazširitev = 'tie';
            setTimeout(() => this.razširiPolje(), 1500);
            return true;
        }

        // Zamenjaj igralca
        this.trenutniIgralec = this.trenutniIgralec === 'o' ? 'x' : 'o';
        this.rišiPloščo();
        
        // AI poteza
        if (this.racunalnikOmogočen) {
            if (this.racunalnikProtiRacunalniku) {
                // V AI vs AI, oba sta AI - vedno naredi potezo
                const zamik = 100;
                console.log('🤖 AI vs AI: Sprožam nasprotni AI (trenutniIgralec=' + this.trenutniIgralec + ')');
                setTimeout(() => this.izvediAIPotezo(), zamik);
            } else if (this.trenutniIgralec === this.racunalnikIgralec) {
                // V PvC, samo ko je red AIja
                const zamik = 300;
                console.log('🤖 PvC: Sprožam AI (trenutniIgralec=' + this.trenutniIgralec + ')');
                setTimeout(() => this.izvediAIPotezo(), zamik);
            } else {
                console.log('👤 PvC: Čakam na človeka (trenutniIgralec=' + this.trenutniIgralec + ')');
            }
        }
        
        return true;
    }

    uporabiGravitacijo(vrsta, stolpec) {
        // Iskalnik od kliknjene vrste NAVZDOL (ne čez ves stolpec)
        // Poišči prvo polno mesto POD kliknjeno vrsto
        for (let v = vrsta + 1; v < this.velikostPolja; v++) {
            if (this.plošča[v][stolpec] !== null || this.zaprte[v][stolpec]) {
                // Našli smo polno mesto, vrni mesto en red nad njim
                if (v - 1 >= vrsta) {
                    return v - 1;
                }
                return -1; // Ni prostora nad njim (je takoj pod klikom)
            }
        }
        // Ni nobenega polnega mesta pod klikom, postavi na dno plošče
        return this.velikostPolja - 1;
    }

    rotirajPloščoUR (plošča, velikost) {
        // Rotira 2D niz za 90° v smeri urinega kazalca
        // Novo polje: novi[col][size-1-red] = stari[red][col]
        const rotirana = Array(velikost).fill(null).map(() => 
            Array(velikost).fill(null)
        );
        
        for (let v = 0; v < velikost; v++) {
            for (let s = 0; s < velikost; s++) {
                rotirana[s][velikost - 1 - v] = plošča[v][s];
            }
        }
        
        return rotirana;
    }

    jeVeljavnaPoteza(vrsta, stolpec) {
        // Preveri ali je stolpec vsaj malo prosto
        if (stolpec < 0 || stolpec >= this.velikostPolja) return false;
        
        // Preverimo ali obstaja kakšno prosto mesto v tem stolpcu
        for (let v = 0; v < this.velikostPolja; v++) {
            if (this.plošča[v][stolpec] === null && !this.zaprte[v][stolpec]) {
                return true;
            }
        }
        return false;
    }

    preveriZmago(vrsta, stolpec) {
        const igralec = this.plošča[vrsta][stolpec];
        const smeri = [
            { dv: 0, ds: 1 },   // Vodoravno
            { dv: 1, ds: 0 },   // Navpično
            { dv: 1, ds: 1 },   // Diagonalno /
            { dv: 1, ds: -1 }   // Diagonalno \
        ];

        for (let smer of smeri) {
            const polja = [{ v: vrsta, s: stolpec }];
            
            // Naprej
            for (let i = 1; i < 4; i++) {
                const v = vrsta + smer.dv * i;
                const s = stolpec + smer.ds * i;
                if (v >= 0 && v < this.velikostPolja && s >= 0 && s < this.velikostPolja && 
                    this.plošča[v][s] === igralec && !this.zaprte[v][s]) {
                    polja.push({ v, s });
                } else break;
            }

            // Nazaj
            for (let i = 1; i < 4; i++) {
                const v = vrsta - smer.dv * i;
                const s = stolpec - smer.ds * i;
                if (v >= 0 && v < this.velikostPolja && s >= 0 && s < this.velikostPolja && 
                    this.plošča[v][s] === igralec && !this.zaprte[v][s]) {
                    polja.unshift({ v, s });
                } else break;
            }

            if (polja.length >= 4) {
                // Vrni le prve 4 celice
                return { igralec, polja: polja.slice(0, 4) };
            }
        }

        return null;
    }

    jePoljePolno() {
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                    return false;
                }
            }
        }
        return true;
    }

    razširiPolje(prikažiSporočilo = true) {
        console.log('📈 Razširitev polja - rezultati O:' + this.rezultati.o + ' X:' + this.rezultati.x);
        
        const staraVelikost = this.velikostPolja;
        this.velikostPolja += 4;

        const novaPlošča = Array(this.velikostPolja).fill(null).map(() => 
            Array(this.velikostPolja).fill(null)
        );
        const novaZaprta = Array(this.velikostPolja).fill(null).map(() => 
            Array(this.velikostPolja).fill(false)
        );

        let ploščaZaUporabo = this.plošča;
        let zaprtaZaUporabo = this.zaprte;
        
        // Preveri ali je izenačenje (rezultat enak za oba)
        const jeIzenačenje = this.rezultati.o === this.rezultati.x;
        
        if (jeIzenačenje) {
            console.log('🔄 OBRAČAM polje - ker je IZENAČENJE (oba ' + this.rezultati.o + ':' + this.rezultati.x + ')');
            ploščaZaUporabo = this.rotirajPloščoUR(this.plošča, staraVelikost);
            zaprtaZaUporabo = this.rotirajPloščoUR(this.zaprte, staraVelikost);
            this.kotAlfabete = (this.kotAlfabete + 90) % 360;
        } else {
            console.log('✓ NE obračam polje - ker NEMA IZENAČENJA (' + this.rezultati.o + ':' + this.rezultati.x + ')');
        }

        // Kopiraj stare podatke v sredino (offset: 2 kvadratka na stran)
        const offset = 2;
        for (let v = 0; v < staraVelikost; v++) {
            for (let s = 0; s < staraVelikost; s++) {
                // Kopiraj znake
                novaPlošča[v + offset][s + offset] = ploščaZaUporabo[v][s];
                // Kopiraj status zapolnjenosti
                novaZaprta[v + offset][s + offset] = zaprtaZaUporabo[v][s];
            }
        }

        this.plošča = novaPlošča;
        this.zaprte = novaZaprta;
        
        // Preslikaj zmagovalna polja sa starim koordinatama na nove koordinate
        this.zmagovalnaPolja = this.zmagovalnaPolja.map(polje => ({
            v: polje.v + offset,
            s: polje.s + offset
        }));
        
        this.trenutniIgralec = 'o';
        this.zgodovina = [];
        this.zadrževanjePobede = 2; // Zadrži zmago za prvi 2 potezi po razširitvi
        this.številoPotez = 0; // Resetiraj brojanje potez za novo povečanje
        
        // Posodobi meje starega območja
        this.stareMeje = {
            minVrsta: offset,
            maxVrsta: offset + staraVelikost - 1,
            minStolpec: offset,
            maxStolpec: offset + staraVelikost - 1
        };
        
        // Počisti stare SVG črte
        const mreža = document.getElementById('gameBoard');
        if (mreža) {
            const stariSvgi = mreža.querySelectorAll('svg');
            stariSvgi.forEach(svg => svg.remove());
        }
        
        if (prikažiSporočilo) {
            this.prikaziSporočilo(`Polje je razširjeno na ${this.velikostPolja}x${this.velikostPolja}! Nova igra.`, 'tie');
        }
        
        this.rišiPloščo();
        this.razlogZaRazširitev = null;
        
        // AI poteza
        if (this.racunalnikOmogočen) {
            if (this.racunalnikProtiRacunalniku) {
                // U AI vs AI, svaki igrač je računalnik, tako da ide AI poteza
                setTimeout(() => this.izvediAIPotezo(), 800);
            } else if (this.trenutniIgralec === this.racunalnikIgralec) {
                // U PvC, samo ako je red računalnika
                setTimeout(() => this.izvediAIPotezo(), 800);
            }
        }
    }

    rotirajPloščo() {
        console.log('🔀 Rotacija plošče med igro!');
        // Obrni ploščo za 90 stopinj v smeri urinega kazalca
        const novaPlošča = Array(this.velikostPolja).fill(null).map(() => 
            Array(this.velikostPolja).fill(null)
        );

        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                // Rotacija: new[c][size-1-r] = old[r][c]
                novaPlošča[s][this.velikostPolja - 1 - v] = this.plošča[v][s];
            }
        }

        this.plošča = novaPlošča;
        this.kotAlfabete += 90;
        this.konecIgre = false;
        this.trenutniIgralec = 'o';
        this.zgodovina = [];
        
        this.prikaziSporočilo('Ploča se je vrtela za 90°!', 'rotating');
        
        // Animiraj rotacijo
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.classList.add('rotating-board');
        setTimeout(() => gameBoard.classList.remove('rotating-board'), 600);
        
        this.rišiPloščo();
    }

    rišiPloščo() {
        const vsebinaPlošče = document.getElementById('gameBoard');
        vsebinaPlošče.innerHTML = '';

        const mreža = document.createElement('div');
        mreža.className = 'board-grid';
        mreža.style.gridTemplateColumns = `repeat(${this.velikostPolja}, 1fr)`;
        mreža.style.position = 'relative';
        mreža.style.display = 'grid';
        mreža.style.gap = '5px';
        mreža.style.width = 'fit-content';
        mreža.style.margin = '0 auto';

        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                const polje = document.createElement('div');
                polje.className = 'cell';
                polje.id = `cell-${v}-${s}`;
                
                const vrednost = this.plošča[v][s];
                if (vrednost) {
                    polje.textContent = vrednost.toUpperCase();
                    polje.classList.add(vrednost);
                }

                // Preveri ali je zapolnjeno (kot del zmage)
                if (this.zaprte[v][s] && vrednost) {
                    polje.classList.add('blocked');
                    // Ne dovoli klikanja na zapolnjene znake
                } else if (!vrednost && !this.zaprte[v][s]) {
                    // Samo prazna neblokirana polja dovolijo klikanje
                    // ALE: samo ako je trenutni igrač čovek (ne računalnik)
                    polje.onclick = () => {
                        // Proverite da li je ovo čovek (ne AI) na redu
                        const jeAIProtiAI = this.racunalnikProtiRacunalniku;
                        const trenutniJeAI = (this.trenutniIgralec === this.racunalnikIgralec) && this.racunalnikOmogočen;
                        
                        if (jeAIProtiAI) {
                            // AI vs AI - ne dovolaj klikanje
                            console.log('⛔ AI vs AI: Klikanje nije dozvoljeno!');
                            return;
                        }
                        
                        if (trenutniJeAI) {
                            // AI je na redu - ne dovolaj klikanje
                            console.log('⛔ Nije tvoj red - AI razmišlja...');
                            return;
                        }
                        
                        // Čovek je na redu - dovolaj potezu
                        this.izvediPotezo(v, s);
                    };
                }

                // Preveri ali je v zmagovalni kombinaciji
                const jeZmagovalno = this.zmagovalnaPolja.some(z => z.v === v && z.s === s);
                if (jeZmagovalno) {
                    polje.classList.add('winning');
                }

                mreža.appendChild(polje);
            }
        }

        vsebinaPlošče.appendChild(mreža);
        
        this.posodobiInfo();
        this.posodobiGumbRazveljavi();
    }

    posodobiInfo() {
        document.getElementById('boardSize').textContent = `${this.velikostPolja}x${this.velikostPolja}`;
        this.posodobiPrikazTežavosti();
        document.getElementById('scoreO').textContent = this.rezultati.o;
        document.getElementById('scoreX').textContent = this.rezultati.x;
        
        const igralecSpan = document.querySelector('#currentPlayer');
        if (this.konecIgre) {
            igralecSpan.innerHTML = 'Igra končana!';
        } else {
            const igralecClass = this.trenutniIgralec === 'o' ? 'player-o' : 'player-x';
            igralecSpan.innerHTML = `Na vrsti: <span class="${igralecClass}">${this.trenutniIgralec.toUpperCase()}</span>`;
        }
    }

    posodobiGumbRazveljavi() {
        const gumbRazveljavi = document.getElementById('undoBtn');
        // Onemogući undo ako:
        // 1. Nema istorije poteza
        // 2. Igra je gotova
        // 3. AI je na redu (čovek ne može da napravi undo dok AI razmišlja)
        const aiJeNaRedu = this.racunalnikOmogočen && (this.trenutniIgralec === this.racunalnikIgralec);
        gumbRazveljavi.disabled = (this.zgodovina.length === 0) || this.konecIgre || aiJeNaRedu;
    }

    posodobiPrikazTežavosti() {
        const prikazTežavosti = document.getElementById('difficultyDisplay');
        if (!prikazTežavosti) return;
        
        if (!this.racunalnikOmogočen) {
            prikazTežavosti.textContent = '';
            return;
        }
        
        let težavnostTekst = '';
        if (this.racunalnikProtiRacunalniku || (this.racunalnikIgralec === 'x' && this.racunalnikOmogočen)) {
            let težavnost = this.racunalnikTežavnost;
            
            if (this.dinamičnaTežavnost) {
                if (this.številoPotez < 3) {
                    težavnostTekst = 'Nasprotnik: Lahka (❶) - Gleda ' + this.globinaPredgleda + ' potez unapred';
                } else if (this.številoPotez < 8) {
                    težavnostTekst = 'Nasprotnik: Srednja (❷) - Gleda ' + this.globinaPredgleda + ' poteza unapred';
                } else {
                    težavnostTekst = 'Nasprotnik: Težka (❸) - Gleda ' + this.globinaPredgleda + ' poteza unapred';
                }
            } else {
                const oznake = {
                    'lahka': 'Lahka 🟢',
                    'srednja': 'Srednja 🟡',
                    'težka': 'Težka 🔴'
                };
                težavnostTekst = 'Nasprotnik: ' + (oznake[težavnost] || težavnost) + ' - Gleda ' + this.globinaPredgleda + ' poteza unapred';
            }
        }
        
        prikazTežavosti.textContent = težavnostTekst;
    }

    razveljavi() {
        if (this.zgodovina.length === 0) return;

        const prejšnja = this.zgodovina.pop();
        this.plošča = prejšnja.plošča;
        this.zaprte = prejšnja.zaprte;
        this.trenutniIgralec = prejšnja.igralec;
        this.velikostPolja = prejšnja.velikostPolja;
        this.kotAlfabete = prejšnja.kotAlfabete;
        this.rezultati = prejšnja.rezultati;
        this.zmagovalnaPolja = prejšnja.zmagovalnaPolja;

        this.rišiPloščo();
        this.clearMessage();
    }

    prikaziSporočilo(besedilo, tip = '') {
        const sporočiloEl = document.getElementById('message');
        sporočiloEl.textContent = besedilo;
        sporočiloEl.className = 'message ' + tip;
    }

    prikaziKomentarAI(besedilo) {
        // Komentarji za AI se ne prikazujejo - funkcija ostaja za kompatibilnost
    }

    clearMessage() {
        const sporočiloEl = document.getElementById('message');
        sporočiloEl.textContent = '';
        sporočiloEl.className = 'message';
    }

    reset() {
        console.log('🔄 Ponovna inicijalizacija igre');
        
        // Ukloni rumenu oznaku za pobjedu
        const winingCells = document.querySelectorAll('.cell.winning');
        winingCells.forEach(cell => cell.classList.remove('winning'));
        
        this.velikostPolja = 5;
        this.plošča = [];
        this.zaprte = [];
        this.trenutniIgralec = 'o';
        this.konecIgre = false;
        this.zgodovina = [];
        this.zmagovalnaPolja = [];
        this.kotAlfabete = 0;
        this.rezultati = { o: 0, x: 0 };
        this.zadrževanjePobede = 0;
        this.stareMeje = { minVrsta: 0, maxVrsta: 4, minStolpec: 0, maxStolpec: 4 };
        this.številoPotez = 0;
        this.dinamičnaTežavost = false;
        this.racunalnikOmogočen = false;
        this.racunalnikProtiRacunalniku = false;
        this.racunalnikIgralec = 'x';
        this.racunalnikTežavnost = 'srednja';
        this.razlogZaRazširitev = null; // Resetiraj razlog za razširitev
        this.globinaPredgleda = 3; // Resetiraj dubino lookahead-a
        this.zgodovinaHevristike = {}; // Hevristika za prikaz časnih dobrih potez
        this.ubijačnePoteze = {}; // Ubijačne poteze za hevristiko
        console.log('✓ Igra je pripravljena - trenutniIgralec=' + this.trenutniIgralec);
        this.clearMessage();
        this.inicializacijaPolja();
    }

    izvediAIPotezo() {
        console.log('🤖 Izvajam AI potezo - trenutniIgralec=' + this.trenutniIgralec);
        
        // Za AI vs AI, oba računalnika se pokreću
        if (!this.racunalnikProtiRacunalniku && this.trenutniIgralec !== this.racunalnikIgralec) {
            console.log('⏭️ Ni AI poteza - čakam na igrača');
            return;
        }

        let rezultat = { vrsta: -1, stolpec: -1, razlog: '' };
        
        // Vedno koristi najjačí hardest algoritam (globina 3)
        this.globinaPredgleda = 3;
        rezultat = this.getHardAIMove();
        rezultat = this.getHardAIMove();

        console.log('✓ AI poteza: [' + rezultat.vrsta + ',' + rezultat.stolpec + ']');

        if (rezultat.vrsta !== -1 && rezultat.stolpec !== -1) {
            console.log('→ Izvajam potezo na [' + rezultat.vrsta + ',' + rezultat.stolpec + ']');
            const uspeh = this.izvediPotezo(rezultat.vrsta, rezultat.stolpec);
            
            // Ako je poteza neuspešna (npr zbog zadrževanjePobede), pokušaj drugom potezom
            if (!uspeh) {
                console.log('❌ Poteza je neuspešna - pokušavam rezervno potezo');
                // Briši poruku o grešci
                this.clearMessage();
                
                // Pokušaj sa random validnom potezom
                const maxPoskusajev = 5;
                for (let poskusaj = 0; poskusaj < maxPoskusajev; poskusaj++) {
                    const rezervniPremik = this.getRandomValidMove2D();
                    if (rezervniPremik.vrsta !== -1 && rezervniPremik.stolpec !== -1) {
                        console.log('  Poskus ' + (poskusaj + 1) + ': [' + rezervniPremik.vrsta + ',' + rezervniPremik.stolpec + ']');
                        const ponovniUspeh = this.izvediPotezo(rezervniPremik.vrsta, rezervniPremik.stolpec);
                        if (ponovniUspeh) {
                            console.log('  ✓ Uspešna rezervna poteza!');
                            break;
                        }
                    }
                }
            }
        } else {
            console.log('⚠️ Neveljavna poteza - ni več možnih potez!');
        }
    }

    getHardAIMove() {
        if (this.zadrževanjePobede === 0) {
            for (let v = 0; v < this.velikostPolja; v++) {
                for (let s = 0; s < this.velikostPolja; s++) {
                    if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                        this.plošča[v][s] = this.trenutniIgralec;
                        if (this.preveriZmago(v, s)) {
                            this.plošča[v][s] = null;
                            return { vrsta: v, stolpec: s, razlog: 'Zmaga!' };
                        }
                        this.plošča[v][s] = null;
                    }
                }
            }
        }

        const nasprotnik = this.trenutniIgralec === 'o' ? 'x' : 'o';
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                    this.plošča[v][s] = nasprotnik;
                    if (this.preveriZmago(v, s)) {
                        this.plošča[v][s] = null;
                        return { vrsta: v, stolpec: s, razlog: 'Blokada!' };
                    }
                    this.plošča[v][s] = null;
                }
            }
        }

        let najboljšaOcena = -Infinity;
        let najboljšaVrsta = -1, najboljšiStolpec = -1;
        let ocenjenoPotez = 0;

        // Izračunaj vrednosti polja pre nego što sortiram poteze
        this.izračunajVrednostiPolj();

        // Zberi vse veljavne poteze in jih sortiraj po hevristiki
        let veljavnePoteze = [];
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                    let preskociti = false;
                    if (this.zadrževanjePobede > 0) {
                        this.plošča[v][s] = this.trenutniIgralec;
                        if (this.preveriZmago(v, s)) {
                            preskociti = true;
                        }
                        this.plošča[v][s] = null;
                    }
                    
                    if (!preskociti) {
                        // Izračunaj prioriteto poteze za Move Ordering
                        const prioriteta = this.izračunajPrioriteto(v, s);
                        veljavnePoteze.push({ vrsta: v, stolpec: s, prioriteta: prioriteta });
                    }
                }
            }
        }

        // Sortiraj poteze po prioriteti (descending) - najpomembnejše poteze prvo
        veljavnePoteze.sort((a, b) => b.prioriteta - a.prioriteta);

        // Log top 3 poteza sa njihovim prioritetama
        console.log('📊 Najboljše 3 opcije:');
        for (let i = 0; i < Math.min(3, veljavnePoteze.length); i++) {
            console.log(`  ${i+1}. [${veljavnePoteze[i].vrsta},${veljavnePoteze[i].stolpec}] (prioriteta: ${veljavnePoteze[i].prioriteta})`);
        }

        // Oceni poteze v urejenem vrstnem redu (Move Ordering za hitrejši alfa-beta)
        for (let poteza of veljavnePoteze) {
            const v = poteza.vrsta;
            const s = poteza.stolpec;
            
            this.plošča[v][s] = this.trenutniIgralec;
            const ocena = this.minimax(nasprotnik, this.globinaPredgleda, -Infinity, Infinity, false);
            ocenjenoPotez++;
            
            if (ocena > najboljšaOcena) {
                najboljšaOcena = ocena;
                najboljšaVrsta = v;
                najboljšiStolpec = s;
            }
            
            this.plošča[v][s] = null;
        }

        if (najboljšaVrsta !== -1) {
            // Posodobi zgodovino hevristike - ta poteza je bila dobra
            const ključ = najboljšaVrsta + ',' + najboljšiStolpec;
            this.zgodovinaHevristike[ključ] = (this.zgodovinaHevristike[ključ] || 0) + 1;
            
            // Log za razmišljanje AI-ja (može se vidjeti u konzoli)
            const globina = this.globinaPredgleda;
            const tekstGlobine = globina === 1 ? '1 potezu unapred' : globina + ' poteza unapred';
            console.log(`🎯 Izbrana poteza: [${najboljšaVrsta},${najboljšiStolpec}] (ocena: ${najboljšaOcena.toFixed(2)}, analiziral ${ocenjenoPotez} potez, ${tekstGlobine})`);
            
            return { vrsta: najboljšaVrsta, stolpec: najboljšiStolpec, razlog: 'Minimax analiza' };
        }

        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                    return { vrsta: v, stolpec: s, razlog: 'Edina možnost' };
                }
            }
        }

        return { vrsta: -1, stolpec: -1, razlog: 'Brez potez' };
    }

    getMediumAIMove() {
        if (this.zadrževanjePobede === 0) {
            for (let v = 0; v < this.velikostPolja; v++) {
                for (let s = 0; s < this.velikostPolja; s++) {
                    if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                        this.plošča[v][s] = this.trenutniIgralec;
                        if (this.preveriZmago(v, s)) {
                            this.plošča[v][s] = null;
                            console.log('🎯 Pobeda v naslednjem potezi! Odabiram [' + v + ',' + s + ']');
                            return { vrsta: v, stolpec: s, razlog: 'Zmaga!' };
                        }
                        this.plošča[v][s] = null;
                    }
                }
            }
        }

        const nasprotnik = this.trenutniIgralec === 'o' ? 'x' : 'o';
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                    this.plošča[v][s] = nasprotnik;
                    if (this.preveriZmago(v, s)) {
                        this.plošča[v][s] = null;
                        return { vrsta: v, stolpec: s, razlog: 'Blokada!' };
                    }
                    this.plošča[v][s] = null;
                }
            }
        }

        const center = Math.floor(this.velikostPolja / 2);
        for (let v = 0; v < this.velikostPolja; v++) {
            if (this.plošča[v][center] === null && !this.zaprte[v][center]) {
                return { vrsta: v, stolpec: center, razlog: 'Sredina' };
            }
        }

        return this.getRandomValidMove2D();
    }

    minimax(trenutniIgralec, globina, alfa, beta, jeMaximiziranje) {
        const nasprotnik = trenutniIgralec === 'o' ? 'x' : 'o';
        
        const hash = this.ustvariHash();
        if (this.transposicijskaTabela.has(hash)) {
            return this.transposicijskaTabela.get(hash);
        }

        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === trenutniIgralec) {
                    if (this.preveriZmago(v, s)) {
                        const rezultat = jeMaximiziranje ? 10000 : -10000;
                        this.transposicijskaTabela.set(hash, rezultat);
                        return rezultat;
                    }
                }
            }
        }

        if (globina === 0) {
            let ocena = 0;
            
            for (let v = 0; v < this.velikostPolja; v++) {
                for (let s = 0; s < this.velikostPolja; s++) {
                    if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                        this.plošča[v][s] = trenutniIgralec;
                        const mojaOcena = this.oceniPozicijo(v, s, trenutniIgralec);
                        
                        this.plošča[v][s] = nasprotnik;
                        const nasprotnikOcena = this.oceniPozicijo(v, s, nasprotnik);
                        
                        this.plošča[v][s] = null;
                        
                        const razlika = jeMaximiziranje ? mojaOcena - nasprotnikOcena : nasprotnikOcena - mojaOcena;
                        ocena += razlika;
                    }
                }
            }
            
            this.transposicijskaTabela.set(hash, ocena);
            return ocena;
        }

        let veljaveIndex = [];
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                    veljaveIndex.push({ vrsta: v, stolpec: s });
                }
            }
        }

        if (veljaveIndex.length === 0) {
            return 0;
        }

        // Sortiraj poteze korištenjem Killer Move Heuristic memorije
        const globinaKljuc = globina;
        veljaveIndex.sort((a, b) => {
            // Provjerite su li poteze u killer move memoriji
            const aUbijačka = (this.ubijačnePoteze[globinaKljuc] === (a.vrsta + ',' + a.stolpec)) ? 1000 : 0;
            const bUbijačka = (this.ubijačnePoteze[globinaKljuc] === (b.vrsta + ',' + b.stolpec)) ? 1000 : 0;
            
            // Sortiraj tako da ubijačke poteze budu prve
            return bUbijačka - aUbijačka;
        });

        if (jeMaximiziranje) {
            let maxOcena = -Infinity;
            let najboljaUbijacka = null;
            
            for (let poteza of veljaveIndex) {
                const v = poteza.vrsta;
                const s = poteza.stolpec;
                this.plošča[v][s] = trenutniIgralec;
                
                const ocena = this.minimax(nasprotnik, globina - 1, alfa, beta, false);
                maxOcena = Math.max(maxOcena, ocena);
                
                // Ako smo našli alfa cutoff, memorisaj ovu potezu kao ubijačku
                if (ocena > alfa) {
                    najboljaUbijacka = v + ',' + s;
                    alfa = ocena;
                }
                
                this.plošča[v][s] = null;
                
                if (beta <= alfa) {
                    // Zapamti ovu potezu kao ubijačku za ovu dubinu
                    if (najboljaUbijacka) {
                        this.ubijačnePoteze[globinaKljuc] = najboljaUbijacka;
                    }
                    break;
                }
            }
            this.transposicijskaTabela.set(hash, maxOcena);
            return maxOcena;
        } else {
            let minOcena = Infinity;
            let najboljaUbijacka = null;
            
            for (let poteza of veljaveIndex) {
                const v = poteza.vrsta;
                const s = poteza.stolpec;
                this.plošča[v][s] = trenutniIgralec;
                
                const ocena = this.minimax(nasprotnik, globina - 1, alfa, beta, true);
                minOcena = Math.min(minOcena, ocena);
                
                // Ako smo našli beta cutoff, memorisaj ovu potezu kao ubijačku
                if (ocena < beta) {
                    najboljaUbijacka = v + ',' + s;
                    beta = ocena;
                }
                
                this.plošča[v][s] = null;
                
                if (beta <= alfa) {
                    // Zapamti ovu potezu kao ubijačku za ovu dubinu
                    if (najboljaUbijacka) {
                        this.ubijačnePoteze[globinaKljuc] = najboljaUbijacka;
                    }
                    break;
                }
            }
            this.transposicijskaTabela.set(hash, minOcena);
            return minOcena;
        }
    }

    ustvariHash() {
        let hash = '';
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                const vrednost = this.plošča[v][s];
                hash += vrednost === null ? '.' : (vrednost === 'o' ? 'O' : 'X');
            }
        }
        return hash;
    }

    izračunajVrednostiPolj() {
        // Izračunaj vrednost za svako polje na osnovu sledečih 5 mogućih potez
        // Polja koja se ne menjaju ostaju nespremenjena
        const stariVrednosti = this.vrednostiPolj || {};
        this.vrednostiPolj = {};
        
        // Za svako polje, proceni koliko dobro bi bilo da ga zaposednem
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                const ključ = v + ',' + s;
                
                // Ako je polje već zaposedeno, preskoči
                if (this.plošča[v][s] !== null) {
                    this.vrednostiPolj[ključ] = 0;
                    continue;
                }
                
                // Ako je polje zaprto (nema potencijala), preskoči
                if (this.zaprte[v][s]) {
                    this.vrednostiPolj[ključ] = 0;
                    continue;
                }
                
                // Izračunaj vrednost za ovo polje
                let vrednost = 0;
                
                // 1. Provera moje pobede (3 u nizu)
                const mojaVrsta = this.prebrojiDolžinoLinije(v, s, this.trenutniIgralec);
                if (mojaVrsta >= 3) vrednost += 200; // Moja pobeda je blizu
                else if (mojaVrsta === 2) vrednost += 50;
                
                // 2. Provera blokade nasprotnika
                const nasprotnik = this.trenutniIgralec === 'o' ? 'x' : 'o';
                const nasprotnikVrsta = this.prebrojiDolžinoLinije(v, s, nasprotnik);
                if (nasprotnikVrsta >= 3) vrednost += 180; // Moram ga blokirati
                else if (nasprotnikVrsta === 2) vrednost += 40;
                
                // 3. Centralna pozicija je bolja
                const center = Math.floor(this.velikostPolja / 2);
                const razdalja = Math.abs(v - center) + Math.abs(s - center);
                vrednost += Math.max(0, 10 - razdalja);
                
                // 4. Simulacija 2 poteze unapred (brzo)
                // Ako postavim komad ovdje, koliko to poboljšava moju poziciju?
                this.plošča[v][s] = this.trenutniIgralec;
                const ocenaKadPostenim = this.oceniPozicijo(v, s, this.trenutniIgralec);
                
                // Koliko to šteti nasprotniku?
                const ocenaNasprotnika = this.oceniPozicijo(v, s, nasprotnik);
                vrednost += (ocenaKadPostenim - ocenaNasprotnika) / 10;
                
                this.plošča[v][s] = null;
                
                this.vrednostiPolj[ključ] = vrednost;
            }
        }
    }

    oceniPozicijo(vrsta, stolpec, igralec) {
        let ocena = 0;
        const nasprotnik = igralec === 'o' ? 'x' : 'o';
        const center = Math.floor(this.velikostPolja / 2);

        const razdaljaOdCentra = Math.abs(vrsta - center) + Math.abs(stolpec - center);
        ocena -= razdaljaOdCentra * 2;

        // Oceni linijo za ta igralec
        const mojaVrsta = this.prebrojiDolžinoLinije(vrsta, stolpec, igralec);
        
        // Eksponencialna penalizacija/nagrada glede na dolžino linije
        // 4 = gotova zmaga (ne sme biti ovdje - to je že preverjeno v minimaxu)
        // 3 = lahko pobjedim, trebam zaštitu
        // 2 = gradim, ali nije kritično
        // 1 = samo prazna ploča
        switch(mojaVrsta) {
            case 4:
                ocena += 5000; // Gotova zmaga (ali bi trebala biti zaustavljena prije)
                break;
            case 3:
                ocena += 300; // Jaka pozicija - mogu pobjeđivati
                break;
            case 2:
                ocena += 50; // Gradim
                break;
            case 1:
                ocena += 5;
                break;
        }

        // Kritično je blokiranje nasprotnika
        const nasprotnikVrsta = this.prebrojiDolžinoLinije(vrsta, stolpec, nasprotnik);
        
        // Blokiranje ima VEĆU vrijednost nego gradnja
        switch(nasprotnikVrsta) {
            case 4:
                ocena += 4000; // Trebam zaustavi lui (kritično)
                break;
            case 3:
                ocena += 400; // Trebam ga blokirati - prioritet je viši nego moja gradnja
                break;
            case 2:
                ocena += 60; // Mogu ga blokirati kasnije
                break;
            case 1:
                ocena += 5;
                break;
        }

        return ocena;
    }

    prebrojiDolžinoLinije(vrsta, stolpec, igralec) {
        const smeri = [
            { dv: 0, ds: 1 },   // Vodoravno
            { dv: 1, ds: 0 },   // Navpično
            { dv: 1, ds: 1 },   // Diagonalno / 
            { dv: 1, ds: -1 }   // Diagonalno \
        ];

        let maxDolžina = 1;

        for (let smer of smeri) {
            let dolžina = 1;
            
            // Naprej
            for (let i = 1; i < 4; i++) {
                const v = vrsta + smer.dv * i;
                const s = stolpec + smer.ds * i;
                if (v >= 0 && v < this.velikostPolja && s >= 0 && s < this.velikostPolja && 
                    this.plošča[v][s] === igralec) {
                    dolžina++;
                } else break;
            }

            // Nazaj
            for (let i = 1; i < 4; i++) {
                const v = vrsta - smer.dv * i;
                const s = stolpec - smer.ds * i;
                if (v >= 0 && v < this.velikostPolja && s >= 0 && s < this.velikostPolja && 
                    this.plošča[v][s] === igralec) {
                    dolžina++;
                } else break;
            }

            maxDolžina = Math.max(maxDolžina, dolžina);
        }

        return maxDolžina;
    }

    izračunajPrioriteto(vrsta, stolpec) {
        // Hevristika za sortiranje potez (Move Ordering)
        // Prioritetizira poteze blizu centra in poteze s zgodovino
        
        let prioriteta = 0;
        const ključ = vrsta + ',' + stolpec;

        // 1. Koristi predračunane vrednosti polja ako su dostupne
        if (this.vrednostiPolj && this.vrednostiPolj[ključ] !== undefined) {
            prioriteta += this.vrednostiPolj[ključ] * 5;
        }

        // 2. Preferenca za blizu centra
        const center = Math.floor(this.velikostPolja / 2);
        const razdaljaOdCentra = Math.abs(vrsta - center) + Math.abs(stolpec - center);
        prioriteta += (10 - razdaljaOdCentra) * 10; // Bližje centu = višja prioriteta

        // 3. Poteze s pozitivno povijesti (History Heuristic)
        if (this.zgodovinaHevristike[ključ]) {
            prioriteta += this.zgodovinaHevristike[ključ] * 20; // Poteze ki so bile dobre = višja prioriteta
        }

        // 4. Poteze ki gradijo naš položaj (Line building)
        const lastniDolžina = this.prebrojiDolžinoLinije(vrsta, stolpec, this.trenutniIgralec);
        prioriteta += lastniDolžina * 50; // Daljše linije = višja prioriteta

        // 5. Blokiranje nasprotnikovih potez
        const nasprotnik = this.trenutniIgralec === 'o' ? 'x' : 'o';
        const nasprotnikDolžina = this.prebrojiDolžinoLinije(vrsta, stolpec, nasprotnik);
        prioriteta += nasprotnikDolžina * 40; // Blokiranje = važno

        return prioriteta;
    }

    nastaviAI(omogočeno, težavnost = 'srednja', aiProtiAi = false) {
        console.log('⚙️ Inicijalizacija AI: omogočeno=' + omogočeno + ', AI vs AI=' + aiProtiAi);
        this.racunalnikOmogočen = omogočeno;
        this.racunalnikTežavnost = težavnost;
        this.racunalnikProtiRacunalniku = aiProtiAi;
        this.številoPotez = 0;
        
        // Postavi lookahead dubinu na osnovo težavnosti
        if (težavnost === 'lahka') {
            this.globinaPredgleda = 1;
        } else if (težavnost === 'srednja') {
            this.globinaPredgleda = 2;
        } else if (težavnost === 'težka') {
            this.globinaPredgleda = 3;
        } else if (težavnost === 'dinamična') {
            this.globinaPredgleda = 2; // Počni sa 2, može se povečati tokom igre
        }
        
        // Naraščajoča težavost se začne kot "easy"
        if (težavnost === 'dinamična') {
            this.dinamičnaTežavost = true;
            this.racunalnikTežavnost = 'lahka';
        }
        
        if (omogočeno) {
            if (aiProtiAi) {
                // Oba sta računalnika - postavi aiPlayer na 'o' samo za konzistentnost (se ne uporablja)
                this.racunalnikIgralec = 'o';
                console.log('🤖 AI vs AI: Oba računalnika - započinjam igru');
                setTimeout(() => this.izvediAIPotezo(), 100);
            } else {
                // Samo en je računalnik - 'x'
                this.racunalnikIgralec = 'x';
                console.log('👤 PvC: Človek (o) vs Računalnik (x)');
                
                if (this.trenutniIgralec === this.racunalnikIgralec) {
                    const zamik = 300;
                    console.log('🤖 Prvi AI poteza čez 300ms');
                    setTimeout(() => this.izvediAIPotezo(), zamik);
                } else {
                    console.log('👤 Čakam na igrača...');
                }
            }
        }
    }

    getRandomValidMove() {
        const validMoves = [];
        for (let s = 0; s < this.velikostPolja; s++) {
            if (this.jeVeljavnaPoteza(0, s)) {
                validMoves.push(s);
            }
        }
        const stolpec = validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : -1;
        console.log('📋 Veljavnih potez: ' + validMoves.length + ', izbrana stolpec: ' + stolpec);
        return stolpec;
    }

    getRandomValidMove2D() {
        const validMoves = [];
        for (let v = 0; v < this.velikostPolja; v++) {
            for (let s = 0; s < this.velikostPolja; s++) {
                if (this.plošča[v][s] === null && !this.zaprte[v][s]) {
                    validMoves.push({ vrsta: v, stolpec: s });
                }
            }
        }
        if (validMoves.length > 0) {
            const move = validMoves[Math.floor(Math.random() * validMoves.length)];
            return move;
        }
        return { vrsta: -1, stolpec: -1, razlog: '' };
    }
}

// Globalna instanca igre
let game;

// Inicijalizacija
function initGame() {
    game = new ŠtiriVVrsto();
    // Na začetku prikaži meni
    showGameMode();
}

function showGame() {
    console.log('🎮 Prikaz igre...');
    try {
        const modeSelect = document.getElementById('modeSelect');
        const difficultySelect = document.getElementById('difficultySelect');
        const gameContainer = document.getElementById('gameContainer');
        console.log('✓ modeSelect pronađen');
        console.log('✓ gameContainer pronađen');
        if (modeSelect) modeSelect.style.display = 'none';
        if (difficultySelect) difficultySelect.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'block';
        console.log('✓ Prikaz promenjen');
        // Osvježi prikaz ploče
        if (game) game.rišiPloščo();
    } catch(e) {
        console.error('❌ Napaka v showGame:', e);
    }
}

function showGameMode() {
    document.getElementById('modeSelect').style.display = 'block';
    document.getElementById('difficultySelect').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
}

function backToMenu() {
    showGameMode();
}

function resetGame() {
    // Spremi AI stanje
    const wasAIEnabled = game.racunalnikOmogočen;
    const wasAIDifficulty = game.racunalnikTežavnost;
    const wasAIVsAi = game.racunalnikProtiRacunalniku;
    
    game.reset();
    
    // Vrati AI stanje ako je bilo omogočeno
    if (wasAIEnabled) {
        game.nastaviAI(true, wasAIDifficulty, wasAIVsAi);
    }
    
    showGame();
}

function undoMove() {
    // Ne dovolaj undo tokom AI igre
    if (game.racunalnikOmogočen && game.trenutniIgralec === game.racunalnikIgralec) {
        console.log('⛔ Nije dozvoljeno da se napravi undo dok AI razmišlja!');
        return;
    }
    game.razveljavi();
}

function startAIGame(težavnost) {
    game.reset();
    game.nastaviAI(true, težavnost);
    showGame();
}

function startPvPGame() {
    console.log('🎮 Čovek vs Čovek igra pokrenut');
    try {
        game.reset();
        console.log('✓ Igra resetirana');
        game.nastaviAI(false);
        console.log('✓ AI onemogočen');
        showGame();
        console.log('✓ Prikaz igre');
    } catch(e) {
        console.error('Napaka v startPvPGame:', e);
    }
}

// Zaženi igro pri nalaganju
window.addEventListener('DOMContentLoaded', function() {
    console.log('✓ DOM učitan');
    initGame();
    
    // Glavni meni - izbira tipa igre
    const pvpBtn = document.getElementById('pvpBtn');
    const pvcBtn = document.getElementById('pvcBtn');
    const aiaiBtn = document.getElementById('aiaiBtn');
    
    if (pvpBtn) {
        pvpBtn.addEventListener('click', () => {
            game.reset();
            game.nastaviAI(false);
            showGame();
        });
    }
    
    if (pvcBtn) {
        pvcBtn.addEventListener('click', () => {
            showDifficultySelect(false);
        });
    }
    
    if (aiaiBtn) {
        aiaiBtn.addEventListener('click', () => {
            showDifficultySelect(true);
        });
    }
    
    // Težavnost
    const diffBtns = document.querySelectorAll('#difficultySelect .mode-btn:not(.back-btn)');
    const backBtn = document.querySelector('#difficultySelect .back-btn');
    
    diffBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            game.reset();
            
            // Svi dugmići sada koriste hardest algoritam
            game.nastaviAI(true, 'težka', pvcAiVsAi);
            
            showGame();
        });
    });
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showGameMode();
        });
    }
    
    // Ostali gumbi
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetGame);
    
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoMove);
    
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', backToMenu);
    
    console.log('✓ Svi event listeneri postavljeni');
    
    // Dark mode toggle
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
            
            // Promijeni emoji - prikazuje trenutno stanje (obrnuto)
            if (document.body.classList.contains('dark-mode')) {
                darkModeBtn.textContent = '☀️';
            } else {
                darkModeBtn.textContent = '🌙';
            }
        });
        
        // Preveri shranjeno preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            darkModeBtn.textContent = '☀️';
        } else {
            darkModeBtn.textContent = '🌙';
        }
    }
});

let pvcAiVsAi = false;

function showDifficultySelect(aiVsAi) {
    pvcAiVsAi = aiVsAi;
    // Umesto da prikazuješ izbor, direktno pokreni igru sa hardest algoritmom
    game.reset();
    game.nastaviAI(true, 'težka', aiVsAi);
    showGame();
}
