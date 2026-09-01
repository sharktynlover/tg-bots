#!/usr/bin/env bash
# Проверка существования группы в API: печатает id и HTTP-код.
for g in "$@"; do
	code=$(curl -s -o /dev/null -w '%{http_code}' "https://akademiks.urtt.ru/api/trpc/schedule.get?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22groupId%22%3A%22$g%22%2C%22teacherId%22%3Anull%2C%22classroomId%22%3Anull%2C%22weekStart%22%3A%222026-08-30T19%3A00%3A00.000Z%22%7D%2C%22meta%22%3A%7B%22values%22%3A%7B%22teacherId%22%3A%5B%22undefined%22%5D%2C%22classroomId%22%3A%5B%22undefined%22%5D%2C%22weekStart%22%3A%5B%22Date%22%5D%7D%2C%22v%22%3A1%7D%7D%7D")
	echo "$g $code"
done
