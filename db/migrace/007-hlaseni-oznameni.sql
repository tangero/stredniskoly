-- Oznámení oznamovateli, že oprava je nasazená (#441). Spouští vlastník ručně.
-- Sloupec značí, že e-mail o vyřízení už odešel (nejvýš jeden na hlášení); po odeslání
-- se adresa v řádku nahradí zástupným textem, hlášení samo zůstává.
alter table hlaseni_chyby add column if not exists oznameno timestamptz;
