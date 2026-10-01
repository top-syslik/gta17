# Asfalt

Jednoduchá městská hra z první osoby v HTML, CSS a Canvas API, bez závislostí.

Spuštění: otevři `index.html`, nebo spusť `python3 -m http.server 8000` a otevři http://localhost:8000 (také z Windows při běhu serveru ve WSL).

- WASD: pohyb vzhledem ke směru pohledu
- Kliknutí do hry: rozhlížení myší (uzamčení kurzoru)
- Šipky nahoru/dolů: chůze; doleva/doprava: otáčení
- Shift: běh; Escape: pauza a uvolnění kurzoru
- Mobil: dotykové šipky a tažení prstem po scéně

Město obsahuje 45 odlišných domů s různými rozměry, výškami, barvami, okny, římsami a střechami. Budovy blokují průchod, minimapa ukazuje pozici a směr. Stromy jsou dekorace; auta a chodci se pohybují samostatně. Vykreslování používá jednoduchou perspektivní projekci polygonů v Canvas 2D.

Domy mají obdélníkové, zkosené, dvanáctiúhelníkové a L půdorysy; kolize i minimapa sledují jejich obrys. Park kombinuje široké listnáče, štíhlé stromy a jehličnany. Devět jezdících a tři zaparkovaná auta střídají šest stylizovaných modelů: Škoda Octavia, Volkswagen Golf, Porsche 911, Land Rover Defender, Ford Transit a BMW 3. Název nejbližšího auta se zobrazí při přiblížení.

Město oživuje 36 NPC chodců s animací chůze a krátkými zastávkami. Doprava sleduje zakřivené ulice a zaoblené trasy kolem bloků; řidiči brzdí před hráčem a provozem. Hráč nemůže procházet auty. Pauza zastaví i NPC a dopravu. Na minimapě jsou jedoucí auta oranžová, zaparkovaná šedá a chodci světle modří.

Kontrola simulace bez prohlížeče: `node tests/simulation.test.cjs` (vyžaduje Node.js). Ověřuje trasy mimo budovy, pohyb, geometrii, pauzu, brzdění před hráčem a vykreslovací průchod s náhradním Canvas API.

Budovy zahrnují 40 obytných domů označených BYTY a po jedné nemocnici, policejní stanici, restauraci, hasičské stanici a obchodu. Mají nápisy na fasádách a odlišné barvy i detaily: nemocniční kříž, policejní znak, hasičská vrata a výlohy s markýzami. Minimapa označuje služby písmeny H (nemocnice), P (policie), R (restaurace), F (hasiči), O (obchod). Tři auta stojí na vyznačených místech ve dvorech mimo průjezdné trasy. U obchodu označeného O lze klávesou E vstoupit do nákupního interiéru. Ostatní budovy jsou exteriéry.

Zvuky: kroky a běh hráče, nárazy do překážek, kroky blízkých chodců, prostorové motory jedoucích aut, občasné troubení stojící dopravy, ptáci a pauza. Kroky a motory používají lokální nahrávky přibalené ke hře; přehrávání zajišťuje Web Audio API. Aktivuje se prvním kliknutím nebo klávesou; tlačítko „Zvuk“ ukládá ztlumení. Pauza ztiší město a skrytí karty pozastaví zvuk.

Pohyb: chodci plynule zrychlují, zpomalují a otáčejí se; animace má kyv paží, ohyb kolen, boty a lehké pohupování těla. Auta zpomalují před zatáčkami a mají plynulejší směr jízdy. Kola s paprsky se otáčejí podle ujeté vzdálenosti a přední kola se natáčejí do zatáček; u zaparkovaných aut a při pauze stojí.

Verze 006: skutečné nahrávky šesti došlapů tenisek na betonu a čtyřsekundové smyčky automobilového motoru nahrazují syntetické bubnové došlapy a generované pulzy. Tempo kroků odpovídá chůzi a běhu; motor mění výšku a intenzitu podle jízdy. Vítr je vypnutý. Tlačítko „Zkusit zvuky“ přehraje ukázku. Nahrávky jsou vložené v lokálním skriptu, takže fungují i při otevření index.html bez serveru. Zdroje, úpravy a licence jsou v [assets/audio/CREDITS.md](assets/audio/CREDITS.md).

Vstupy všech 45 budov, nápisy a detaily průčelí míří k blízké silnici. Výběr strany sleduje zakřivení ulic a kontroluje, že přístup nevede přes jinou budovu.

Auta mají samostatné stylizované tvary: Octavia delší střechu liftbacku a svislé lamely masky, Golf krátkou karoserii hatchbacku, Porsche 911 nízkou oblou střechu a kulatá světla, Defender hranatou kabinu a rezervu vzadu, Transit vysoký nákladový prostor se zadními dveřmi a BMW 3 delší kapotu a dvojitou masku. Otáčení a natáčení kol zůstává navázané na pohyb.

Řízení: přistup ke stojícímu nebo pomalu jedoucímu autu a stiskni E (nebo tlačítko Nastoupit). W / šipka nahoru přidává plyn, S / dolů brzdí a couvá, A/D nebo šipky zatáčejí, mezerník brzdí. Kamera je z místa řidiče. Klávesou E lze vystoupit i za jízdy nebo během odrazu po nárazu; hra najde volné místo u dveří a auto okamžitě zastaví a zaparkuje. Na mobilu slouží šipky, tlačítko Brzda a Nastoupit/Vystoupit. Auto má kolize s domy, auty, chodci a okrajem mapy. Test: `node tests/driving.test.cjs`.

Obsazená auta: přistup z levé strany k řidiči a stiskni E. Auto zastaví, hráč otevře dveře, vytáhne řidiče a nastoupí. U prázdného zamčeného auta nejdříve rozbije okno. Převzaté auto zůstane odemčené a další nastoupení je okamžité. Escape pozastaví i sekvenci. Test: `node tests/takeover.test.cjs`.

Interiéry (verze 009): všech šest modelů má vlastní stylizovanou palubní desku, přístroje, volant a čalounění. Sedačky a palubní deska mají i 3D geometrii viditelnou při nastupování. Z místa řidiče je vidět čelní sklo a tři zrcátka se skutečným pohledem dozadu, obnovovaným přibližně desetkrát za sekundu. Rozbité boční okno je geometricky otevřené; střepy vylétnou ven, padají na zem a postupně zmizí. Pauza zastaví i střepy. Test interiérů: `node tests/cockpit.test.cjs`.

Hledanost: HUD ukazuje 0–5 hvězd. První hvězda přijde po 8 sekundách jízdy mimo vozovku; další po 12 sekundách pokračování. Tři výrazné nárazy do aut nebo chodců během 20 sekund přidají hvězdu; jeden souvislý kontakt se nepočítá opakovaně. Ze stanice vyjíždějí dvě policejní Škody za každou hvězdičku (2, 4, 6, 8 nebo 10 hlídek) s majáky a sirénami. Hledají průjezd kolem domů a preferují silnice. Po více než 20 sekundách mimo dosah hlídek hledanost postupně klesá, pokud nepácháš další přestupky. Po ukončení pátrání hlídky zhasnou majáky a vracejí se ke stanici. Pauza zastaví i policii a časovače. Test: `node tests/police.test.cjs`.

Srážky aut s chodci: pohybující se hráčovo, civilní i policejní auto může NPC odhodit přibližně o metr. Následuje krátký pád, zvednutí a šestisekundový útěk. Překážky zkrátí odhození; NPC neprojde zdí a po útěku pokračuje z aktuální pozice. Opakovaný kontakt během reakce ji nespouští znovu. Hledanost se započítává jen za hráčovy nárazy. Test: `node tests/pedestrian-hit.test.cjs`.

Policejní zastavení (verze 012): po nárazu do překážky hlídka krátce vycouvá, znovu naplánuje cestu a pokračuje v honičce. Když policejní auto fyzicky blokuje stojící hráčovo auto, běží viditelný desetisekundový odpočet. Rozjetí nebo vycouvání odpočet resetuje a policie dál pronásleduje. Deset nepřerušených sekund znamená jednorázovou pokutu 500 Kč a ukončení aktuálního pátrání. Herní zůstatek začíná na 5 000 Kč a ukládá se v prohlížeči. Test: `node tests/police-stop.test.cjs`.

Policie a chůze (verze 013): při aktivním pátrání kontakt s policejním autem mimo vlastní auto znamená okamžitou jednorázovou pokutu 500 Kč a konec pátrání. Platí při příchodu hráče i při jízdě či couvání hlídky. Do policejních aut nelze nastoupit ani z nich vytáhnout řidiče. Test: `node tests/police-foot.test.cjs`.

Návrat hlídek a pokuta (verze 014): po skončení pátrání se hlídky vracejí do samostatných parkovacích míst vedle policejní stanice a při dalším pátrání odtud znovu vyjedou. Pokuta na tři sekundy zešedí obrazovku a zobrazí nápis „Pokuta 500 Kč,-“. Test: `node tests/police-return.test.cjs`.

Auta a převzetí řidiče (verze 015): WebGL vykresluje plochy s hloubkovým testem, takže se karoserie, okna a interiér nepřekreslují podle vzdálenosti středu plochy. Canvas zůstává záložním vykreslováním pro zařízení bez WebGL. Kapota nepřekrývá kabinu a otevřené dveře odhalují skutečný otvor. Překryvné ruce při převzetí jsou odstraněné; dveře se otevírají během vytahování, řidič se naklání a narovnává, hráč ustoupí a plynule nastoupí. Testy: `node tests/renderer.test.cjs` a `node tests/takeover.test.cjs`.

Automatická převodovka: při jízdě auta řadí šest stupňů podle rychlosti, při brzdění podřazují. HUD a palubní displej ukazují D1–D6 nebo R, zvuk motoru a otáčkoměr reagují na řazení. Herní maximálky: Octavia 210, Golf 195, Porsche 911 230, Defender 175, Transit 145 a BMW 3 250 km/h. Porsche má také výrazně rychlejší zrychlení než Transit. Jde o herní nastavení, nikoli specifikace konkrétních ročníků. Zpátečka má limit 20 km/h. Test: `node tests/powertrain.test.cjs`.

Ve vyšší rychlosti se plynule snižuje maximální natočení kol a zjemňuje reakce řízení. Porsche má mírnější akceleraci a maximálku 230 km/h.

Drift: při jízdě vpřed nad 25 km/h zatoč a podrž mezerník (na mobilu tlačítko Brzda). Zadní náprava se utrhne a auto klouže bokem. Po uvolnění ruční brzdy se přilnavost postupně obnoví; smyk lze korigovat opačným řízením. Při brzdění rovně a v malé rychlosti mezerník dál zastaví auto.

Obchod a výbava: dojdi pěšky ke vchodu budovy OBCHOD (O na minimapě) a stiskni E. Uvnitř se volně procházíš pomocí WASD a rozhlížíš myší nebo šipkami. V pěti regálech je fyzicky vystavené zboží s cenovkami: Zbraně, Náboje, Auta, Motorky a Jídlo a pití. Přistup k polici, podívej se na vybranou věc a stiskni E; poneseš ji v košíku. U vozidel bereš prodejní kartičku. Přines košík k prodavači za pokladnou a stiskni E — až tam se odečtou peníze a získáš nákup. R vrací poslední kus zpět do police. Pokud nemáš dost peněz nebo není místo pro vozidla, celý nákup zůstane nezaplacený. Zbraně i jejich náboje lze koupit současně. S nezaplaceným zbožím nelze odejít. Ven se vrátíš klávesou E u dveří označených VÝCHOD. Escape pozastaví i pohyb uvnitř; město venku během návštěvy stojí. Nezaplacený košík se při obnovení stránky vrátí do polic.

- Zbraně: pistole (1 200 Kč), rifle (3 500 Kč), AK (6 500 Kč), rotačák (18 000 Kč). Součástí nákupu je počáteční munice; další náboje se kupují podle zbraně. Q mění zbraň, levé tlačítko myši střílí, AK a rotačák střílejí při držení. Na mobilu slouží tlačítka Zbraň a Střelba. Střelba funguje pěšky, respektuje stěny a auta a vyvolává reakci NPC, ale sama nepřivolá policii.
- Auta: Apex GT 280 km/h (28 000 Kč), Vortex R 320 km/h (65 000 Kč), Tempest X 360 km/h (120 000 Kč). Zachovávají automatickou převodovku, citlivost řízení podle rychlosti a drifty.
- Motorky s vlastní geometrií a řídítky: Yamaha R1 285 km/h (15 000 Kč), Kawasaki Ninja 310 km/h (24 000 Kč), Ducati Panigale 330 km/h (35 000 Kč). Rychlosti jsou herní nastavení.
- Jídlo a pití doplňuje zdraví ihned při nákupu: sendvič +30 (80 Kč), jídlo +65 (180 Kč), voda +15 (35 Kč), energetický drink +40 (100 Kč). Zdraví má strop 100; při plném zdraví se nákup neúčtuje. Prudké nárazy zdraví ubírají; při vyčerpání následuje ošetření v nemocnici za 250 Kč.
- Koupené vozidlo čeká před obchodem. Vlastněný model lze bez další platby přistavit znovu; pokud není místo, nákup se neúčtuje. Zbraně, munice, zdraví, peníze a seznam vlastněných vozidel se ukládají v prohlížeči. Po obnovení stránky si vozidlo přistav z obchodu.

Kontrola obchodu: `node tests/shop.test.cjs` (pohyb v interiéru, police, košík, pokladna, platby, peníze, inventář, léčení, vozidla, motorky, střelba, NPC a uložení). Kontrola driftů: `node tests/drift.test.cjs`.

Skákání: při chůzi venku i uvnitř obchodu stiskni mezerník (na mobilu tlačítko Skok). Jeden stisk provede jeden skok, držení klávesy nezpůsobuje opakované odrazy a ve vzduchu nelze skočit znovu. Kamera i výška výstřelu sledují skok; stěny, regály a auta dál blokují průchod. V autě mezerník zůstává ruční brzdou pro brzdění a drift. Test: `node tests/jump.test.cjs`.

Odrazy při srážkách: hráčovo vozidlo se od zdí a všech okrajů mapy odráží podle směru a síly nárazu. U šikmého nárazu zůstává i pohyb podél překážky. Při nárazu do auta se impuls přenese na obě vozidla podle jejich hmotnosti (motorka je lehčí než Transit); odhozené auto může narazit do dalšího. Pohyb po nárazu postupně tlumí tření, mezerník jej urychleně zabrzdí. Během odrazu lze vystoupit klávesou E. Plyn nebo zpátečka ihned obnoví přilnavost a ovládání auta, bez čekání na konec odrazu. Zasažená civilní auta po odhození zůstanou stát na novém místě, policejní auta obnoví svou jízdu. Test: `node tests/rebound.test.cjs`.

Zbraně v rukou: pistole, rifle, AK a rotačák mají vlastní barevné stylizované 3D modely se dvěma rukama v rukavicích. Při chůzi se mírně pohupují, při střelbě mají zpětný ráz a záblesk u ústí. F spustí krátké otočení zbraně v rukou pro prohlédnutí z obou stran. Střelba animaci přeruší, změna zbraně ji zruší, pauza ji zastaví. Na mobilu je tlačítko Prohlédnout. Modely jsou vlastní stylizované herní modely.

Kontrola modelů a prohlížení zbraní: `node tests/weapons.test.cjs`.

Zvuky zbraní: každá zbraň má vlastní vrstvený výstřel s ostrým prásknutím, hlubší ranou, kovovým cvaknutím a dozvukem. Pistole je krátká, rifle hlubší s delším dozvukem, AK úderné a rotačák má krátké zvuky pro souvislou dávku. Drobné obměny brání jednotvárnému opakování. Zvuky vznikají lokálně přes Web Audio API a fungují i bez internetu; respektují pauzu a ztlumení. Kontrola: `node tests/audio.test.cjs`.

Pohled: R venku přepíná první a třetí osobu, pěšky i v běžném autě. Kamera zezadu ukazuje postavu nebo celé vozidlo a přibližuje se před překážkami. V obchodě R vrací zboží.

Policejní stanice má deset vyznačených parkovacích míst. Každá hlídka se po skončení pátrání vrací na vlastní volné místo. Zaseknutá hlídka zkouší bezpečné vycouvání a zatáčení; pokud má překážku za sebou, vyjede vpřed. Po manévru znovu naplánuje cestu k hráči.


Verze 020: práce jsou samostatné hratelné směny v průchozích pracovištích. U nemocnice, restaurace, policie a hasičů stiskni E u vchodu; v obchodě u stojanu PRÁCE. WASD ovládá chůzi, myš nebo šipky pohled. Přistup ke zvýrazněnému stanovišti a stiskni E; vybírej odpovědi tlačítky nebo klávesami 1–3. Časované činnosti probíhají jen při práci u stanoviště a pozastaví se přes Escape.

- Nemocnice: kontrola pacienta, výběr zdravotních pomůcek, dezinfekce a obvaz, záznam do karty.
- Restaurace: výběr surovin podle objednávky, vaření či opékání, příprava porce a výdej.
- Policie: převzetí hlášení, výslech svědka, porovnání značky auta se záznamem, předání informací hlídce.
- Hasiči: ochranná výbava, připojení hadice, výběr postupu, hašení hořící palety a kontrola místa. Plameny postupně mizí.
- Obchod: převzetí nákupu, skenování, výpočet vrácených peněz a vydání účtenky i zboží.

Odměna 5 000 Kč přijde až po celé směně, jednou. Přerušená směna se neplatí; klávesou E u dveří lze odejít. Byty práce nenabízejí. Směny se přes obnovení stránky neukládají. Kontrola: `node tests/work.test.cjs`. Policejní parkoviště mimo silnici obsahuje deset hlídek už při startu.
