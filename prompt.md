segui quanto descritto in docs/FRONTEND_API.md per generare il FE di un applicazioni di voting

cosa deve fare questo frontend?

1 pagina iniziale con doppia "vista"

| importa csv per generare una sessione |
| ------------------------------------  |
| inserisci un codice sessione          |

2 sia se l importa va a buon fine che se il codice adesione è corretto csv atterra in una vista dove inserisce la propria email e aderisce alla sessione

3 se l adesione è confermata, viene reindirizzato alla pagina della sessione di voting dove vedra

| cfp 1 nome - cfp1 descrizione - criterio_1 - criterio_2 - ecc - pulsante vota                                                                        |
| cfp 2 nome - cfp2 descrizione - criterio_1 - criterio_2 - ecc - pulsante vota                                                                        |
| cfp ...                                                       - pulsante vota                                                                        |
| ------------------------------------------------------------------------------                                                                       |
| box in cui vede i risultati disposti per righe, ognuna delle quali mostra il nome del cfp e i punteggi ottenuti per ciascun criterio da ogni votante |

(nota il pulsante vota richiede conferma perche non sarà possibile tornare indietro)
(nota 2 il box dei risultati avra' sopra un pulsante per aggiornare i risultati)


vorrei che la tecnologia fosse typescript con React(-router).
genera gli eventuali .env con le variabili necessarie per connettersi al backend e configurare il frontend.


---

molto positiva queste sessione, vorrei portare pero queste modifiche: 
per l adesione vorrei un username non una mail
nella schermata di voting non mostrare descrizione
nella schermata di voting al box dei risultati vorrei che per ogni cfp si vedesse cosa ha votato ogni singolo votante e poi oltre la media vorrei la somma dei punteggi
