const http = require('node:http');

const students = [
  { id: 1, name: 'faizan', email: 'faizan@example.com', className: 'BSCS-5A' },
  { id: 2, name: 'munawar', email: 'munawar@example.com', className: 'BSCS-5A' }
];

const teachers = [
  { id: 1, name: 'zeshan', subject: 'Web Development' },
  { id: 2, name: 'faizan', subject: 'Database Systems' }
];

const attendance = [
  { id: 1, studentId: 1, date: '2026-10-22', status: 'Present' }
];

const marks = [
  { id: 1, studentId: 1, subject: 'Web Development', score: 85, total: 100 }
];

let nextStudentId = 3;
let nextTeacherId = 3;
let nextAttendanceId = 2;
let nextMarkId = 2;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3002');

  const reply = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  };

  const readBody = async () => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Request body must be valid JSON');
    }
  };

  const parts = url.pathname.split('/').filter(Boolean);
  const resource = parts[0];
  const id = parts[1] === undefined ? null : Number(parts[1]);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return reply(200, { status: 'ok' });
    }

    if (resource === 'students') {
      if (req.method === 'GET' && id === null) return reply(200, students);

      if (req.method === 'GET' && id !== null) {
        const student = students.find(s => s.id === id);
        return student ? reply(200, student) : reply(404, { error: 'Student not found' });
      }

      if (req.method === 'POST' && id === null) {
        const body = await readBody();
        if (!body.name || !body.email || !body.className) {
          return reply(400, { error: 'name, email and className are required' });
        }
        const student = {
          id: nextStudentId++,
          name: body.name,
          email: body.email,
          className: body.className
        };
        students.push(student);
        return reply(201, student);
      }

      if (req.method === 'PUT' && id !== null) {
        const student = students.find(s => s.id === id);
        if (!student) return reply(404, { error: 'Student not found' });
        const body = await readBody();
        student.name = body.name ?? student.name;
        student.email = body.email ?? student.email;
        student.className = body.className ?? student.className;
        return reply(200, student);
      }

      if (req.method === 'DELETE' && id !== null) {
        const index = students.findIndex(s => s.id === id);
        if (index === -1) return reply(404, { error: 'Student not found' });
        const deleted = students.splice(index, 1)[0];

        for (let i = attendance.length - 1; i >= 0; i--) {
          if (attendance[i].studentId === id) attendance.splice(i, 1);
        }
        for (let i = marks.length - 1; i >= 0; i--) {
          if (marks[i].studentId === id) marks.splice(i, 1);
        }
        return reply(200, { message: 'Student deleted', student: deleted });
      }
    }

    if (resource === 'teachers') {
      if (req.method === 'GET' && id === null) return reply(200, teachers);

      if (req.method === 'GET' && id !== null) {
        const teacher = teachers.find(t => t.id === id);
        return teacher ? reply(200, teacher) : reply(404, { error: 'Teacher not found' });
      }

      if (req.method === 'POST' && id === null) {
        const body = await readBody();
        if (!body.name || !body.subject) {
          return reply(400, { error: 'name and subject are required' });
        }
        const teacher = { id: nextTeacherId++, name: body.name, subject: body.subject };
        teachers.push(teacher);
        return reply(201, teacher);
      }

      if (req.method === 'PUT' && id !== null) {
        const teacher = teachers.find(t => t.id === id);
        if (!teacher) return reply(404, { error: 'Teacher not found' });
        const body = await readBody();
        teacher.name = body.name ?? teacher.name;
        teacher.subject = body.subject ?? teacher.subject;
        return reply(200, teacher);
      }

      if (req.method === 'DELETE' && id !== null) {
        const index = teachers.findIndex(t => t.id === id);
        if (index === -1) return reply(404, { error: 'Teacher not found' });
        const deleted = teachers.splice(index, 1)[0];
        return reply(200, { message: 'Teacher deleted', teacher: deleted });
      }
    }

    if (resource === 'attendance') {
      if (req.method === 'GET' && id === null) return reply(200, attendance);

      if (req.method === 'GET' && id !== null) {
        const record = attendance.find(a => a.id === id);
        return record ? reply(200, record) : reply(404, { error: 'Attendance record not found' });
      }

      if (req.method === 'POST' && id === null) {
        const body = await readBody();
        const studentId = Number(body.studentId);
        const validStudent = students.some(s => s.id === studentId);
        if (!validStudent || !body.date || !['Present', 'Absent', 'Late'].includes(body.status)) {
          return reply(400, {
            error: 'Valid studentId, date and status (Present, Absent or Late) are required'
          });
        }
        const record = {
          id: nextAttendanceId++,
          studentId,
          date: body.date,
          status: body.status
        };
        attendance.push(record);
        return reply(201, record);
      }

      if (req.method === 'PUT' && id !== null) {
        const record = attendance.find(a => a.id === id);
        if (!record) return reply(404, { error: 'Attendance record not found' });
        const body = await readBody();

        if (body.studentId !== undefined &&
            !students.some(s => s.id === Number(body.studentId))) {
          return reply(400, { error: 'Student does not exist' });
        }
        if (body.status !== undefined &&
            !['Present', 'Absent', 'Late'].includes(body.status)) {
          return reply(400, { error: 'status must be Present, Absent or Late' });
        }

        record.studentId = body.studentId === undefined ? record.studentId : Number(body.studentId);
        record.date = body.date ?? record.date;
        record.status = body.status ?? record.status;
        return reply(200, record);
      }

      if (req.method === 'DELETE' && id !== null) {
        const index = attendance.findIndex(a => a.id === id);
        if (index === -1) return reply(404, { error: 'Attendance record not found' });
        return reply(200, {
          message: 'Attendance deleted',
          attendance: attendance.splice(index, 1)[0]
        });
      }
    }

    if (resource === 'marks') {
      if (req.method === 'GET' && id === null) return reply(200, marks);

      if (req.method === 'GET' && id !== null) {
        const mark = marks.find(m => m.id === id);
        return mark ? reply(200, mark) : reply(404, { error: 'Mark record not found' });
      }

      if (req.method === 'POST' && id === null) {
        const body = await readBody();
        const studentId = Number(body.studentId);
        const score = Number(body.score);
        const total = Number(body.total);

        if (!students.some(s => s.id === studentId) || !body.subject ||
            body.score === undefined || body.total === undefined ||
            !Number.isFinite(score) || !Number.isFinite(total) ||
            total <= 0 || score < 0 || score > total) {
          return reply(400, {
            error: 'Valid studentId, subject, score and total are required; score must be between 0 and total'
          });
        }

        const mark = {
          id: nextMarkId++,
          studentId,
          subject: body.subject,
          score,
          total
        };
        marks.push(mark);
        return reply(201, mark);
      }

      if (req.method === 'PUT' && id !== null) {
        const mark = marks.find(m => m.id === id);
        if (!mark) return reply(404, { error: 'Mark record not found' });
        const body = await readBody();

        const studentId = body.studentId === undefined ? mark.studentId : Number(body.studentId);
        const subject = body.subject ?? mark.subject;
        const score = body.score === undefined ? mark.score : Number(body.score);
        const total = body.total === undefined ? mark.total : Number(body.total);

        if (!students.some(s => s.id === studentId)) {
          return reply(400, { error: 'Student does not exist' });
        }
        if (!subject || !Number.isFinite(score) || !Number.isFinite(total) ||
            total <= 0 || score < 0 || score > total) {
          return reply(400, {
            error: 'Valid subject, score and total are required; score must be between 0 and total'
          });
        }

        mark.studentId = studentId;
        mark.subject = subject;
        mark.score = score;
        mark.total = total;
        return reply(200, mark);
      }

      if (req.method === 'DELETE' && id !== null) {
        const index = marks.findIndex(m => m.id === id);
        if (index === -1) return reply(404, { error: 'Mark record not found' });
        return reply(200, { message: 'Mark record deleted', mark: marks.splice(index, 1)[0] });
      }
    }

    return reply(404, { error: 'Route not found' });
  } catch (error) {
    return reply(400, { error: error.message || 'Something went wrong' });
  }
});

server.listen(3002, () => {
  console.log('Student Management API running at http://localhost:3002');
  console.log('Try http://localhost:3002/health');
});
