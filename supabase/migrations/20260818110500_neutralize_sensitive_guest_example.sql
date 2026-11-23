-- Ersetzt einen datenschutzrechtlich unnötig sensiblen Testdaten-Text
-- (Gesundheitsangabe "Allergikerin (Gluten)" bei Testgast S. Klein) durch ein
-- neutrales Zimmer-/Aufenthalts-Vorlieben-Beispiel. Betrifft ausschließlich
-- Testdaten, keine echten Gästedaten. Dieser Beispieltext war u.a. im
-- Empfehlungen-Panel des Dashboards sichtbar und diente als Vorlage für den
-- Dashboard-Screenshot der öffentlichen Landingpage.
update guests
set
  vip_notes = 'Bevorzugt ruhige Zimmer zur Gartenseite. Hat letztes Jahr Fahrräder für einen Ausflug gemietet.',
  preferences = array['Zimmer zur Gartenseite', 'Fahrradverleih']
where id = '22222222-2222-2222-2222-222222222228';

update ai_recommendations
set
  title = 'Vorliebe beachten: S. Klein',
  description = 'Bevorzugt bei früheren Aufenthalten ruhige Zimmer zur Gartenseite – bei der Zimmerzuteilung berücksichtigen.'
where id = '5ff3dfbf-a2da-44f1-a47f-e7942decfae4';
