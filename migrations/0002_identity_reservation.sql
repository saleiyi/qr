-- One identity per workspace, including its pending owner/member reservation.
CREATE UNIQUE INDEX pilot_member_email_reservation ON pilot_member(email COLLATE NOCASE);
