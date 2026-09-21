require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const User = require('./models/User');
const Task = require('./models/Task');
const Review = require('./models/Review');
const Notification = require('./models/Notification');

const seedData = async () => {
  try {
    console.log('Syncing database (dropping tables)...');
    await sequelize.sync({ force: true }); // Drops and recreates tables

    const defaultPassword = await bcrypt.hash('12345678', 10);

    // --- 1. HR Manager (1) ---
    const hr = await User.create({
      name: 'Amaya Senanayake',
      email: 'amaya.hr@altrium.com',
      password: defaultPassword,
      plain_password: '12345678',
      role: 'hr_manager',
      department: 'Human Resources',
      team: 'N/A',
      login_count: 0
    });

    // --- 2. Department Managers (2) ---
    const itDept = await User.create({
      name: 'Dinesh Jayawardena',
      email: 'dinesh.it@altrium.com',
      password: defaultPassword,
      plain_password: '12345678',
      role: 'department_manager',
      department: 'IT',
      team: 'N/A',
      manager_id: hr.id,
      login_count: 0
    });

    const financeDept = await User.create({
      name: 'Chamari Perera',
      email: 'chamari.finance@altrium.com',
      password: defaultPassword,
      plain_password: '12345678',
      role: 'department_manager',
      department: 'Finance',
      team: 'N/A',
      manager_id: hr.id,
      login_count: 0
    });

    // --- 3. Team Managers (8) ---
    const teams = [
      { name: 'Sarah Fernando', email: 'sarah.software@altrium.com', role: 'team_manager', department: 'IT', team: 'Software Development', manager_id: itDept.id, quarter_batch: 'Q1' },
      { name: 'Kasun Bandara', email: 'kasun.qa@altrium.com', role: 'team_manager', department: 'IT', team: 'Quality Assurance', manager_id: itDept.id, quarter_batch: 'Q1' },
      { name: 'Asanka Wijesinghe', email: 'asanka.support@altrium.com', role: 'team_manager', department: 'IT', team: 'IT Support and Operations', manager_id: itDept.id, quarter_batch: 'Q1' },
      { name: 'Tharindu Gunaratne', email: 'tharindu.cyber@altrium.com', role: 'team_manager', department: 'IT', team: 'Cyber Security', manager_id: itDept.id, quarter_batch: 'Q2' },
      { name: 'Dilini Rajapakse', email: 'dilini.uiux@altrium.com', role: 'team_manager', department: 'IT', team: 'UI/UX', manager_id: itDept.id, quarter_batch: 'Q2' },
      { name: 'Malan Dissanayake', email: 'malan.accounting@altrium.com', role: 'team_manager', department: 'Finance', team: 'Accounting', manager_id: financeDept.id, quarter_batch: 'Q2' },
      { name: 'Chathurika Peiris', email: 'chathurika.analysis@altrium.com', role: 'team_manager', department: 'Finance', team: 'Financial Analysis', manager_id: financeDept.id, quarter_batch: 'Q3' },
      { name: 'Nuwan De Silva', email: 'nuwan.finops@altrium.com', role: 'team_manager', department: 'Finance', team: 'Finance Operations', manager_id: financeDept.id, quarter_batch: 'Q3' }
    ];
    const teamManagers = await User.bulkCreate(teams.map(t => ({ ...t, password: defaultPassword, plain_password: '12345678', login_count: 0 })));
    
    // Map team names to TM instances
    const tmMap = {};
    for (const tm of teamManagers) {
      tmMap[tm.team] = tm;
    }

    // --- 4. Employees (79) ---
    const employeesData = [
      // Software Development
      { name: 'Kavith Perera', email: 'kavith.perera@altrium.com', q: 'Q1', team: 'Software Development' },
      { name: 'Oshan Wickramasinghe', email: 'oshan.wickramasinghe2@altrium.com', q: 'Q2', team: 'Software Development' },
      { name: 'Avishka Wijesinghe', email: 'avishka.wijesinghe3@altrium.com', q: 'Q3', team: 'Software Development' },
      { name: 'Gayan Liyanage', email: 'gayan.liyanage4@altrium.com', q: 'Q1', team: 'Software Development' },
      { name: 'Suranga Munasinghe', email: 'suranga.munasinghe5@altrium.com', q: 'Q2', team: 'Software Development' },
      { name: 'Nimal Jayakody', email: 'nimal.jayakody6@altrium.com', q: 'Q3', team: 'Software Development' },
      { name: 'Dimuthu Karunanayake', email: 'dimuthu.karunanayake7@altrium.com', q: 'Q1', team: 'Software Development' },
      { name: 'Shehan Rodrigo', email: 'shehan.rodrigo8@altrium.com', q: 'Q2', team: 'Software Development' },
      { name: 'Shehan Dissanayake', email: 'shehan.dissanayake9@altrium.com', q: 'Q3', team: 'Software Development' },
      { name: 'Indika Rodrigo', email: 'indika.rodrigo10@altrium.com', q: 'Q1', team: 'Software Development' },

      // Quality Assurance
      { name: 'Nimali Silva', email: 'nimali.silva@altrium.com', q: 'Q1', team: 'Quality Assurance' },
      { name: 'Bhanuka Fernando', email: 'bhanuka.fernando12@altrium.com', q: 'Q2', team: 'Quality Assurance' },
      { name: 'Dinuka Jayatilake', email: 'dinuka.jayatilake13@altrium.com', q: 'Q3', team: 'Quality Assurance' },
      { name: 'Menuka Samarasinghe', email: 'menuka.samarasinghe14@altrium.com', q: 'Q1', team: 'Quality Assurance' },
      { name: 'Yashoda Welgama', email: 'yashoda.welgama15@altrium.com', q: 'Q2', team: 'Quality Assurance' },
      { name: 'Ranil Nanayakkara', email: 'ranil.nanayakkara16@altrium.com', q: 'Q3', team: 'Quality Assurance' },
      { name: 'Sajith Siriwardena', email: 'sajith.siriwardena17@altrium.com', q: 'Q1', team: 'Quality Assurance' },
      { name: 'Thilina Fernando', email: 'thilina.fernando18@altrium.com', q: 'Q2', team: 'Quality Assurance' },
      { name: 'Niroshan Silva', email: 'niroshan.silva19@altrium.com', q: 'Q3', team: 'Quality Assurance' },
      { name: 'Isuru Karunaratne', email: 'isuru.karunaratne20@altrium.com', q: 'Q1', team: 'Quality Assurance' },

      // IT Support and Operations
      { name: 'Dhananjaya Bandara', email: 'dhananjaya.bandara21@altrium.com', q: 'Q1', team: 'IT Support and Operations' },
      { name: 'Menuka Wijesinghe', email: 'menuka.wijesinghe22@altrium.com', q: 'Q2', team: 'IT Support and Operations' },
      { name: 'Dimuthu Rodrigo', email: 'dimuthu.rodrigo23@altrium.com', q: 'Q3', team: 'IT Support and Operations' },
      { name: 'Namal Weerasinghe', email: 'namal.weerasinghe24@altrium.com', q: 'Q1', team: 'IT Support and Operations' },
      { name: 'Niroshan Illangakoon', email: 'niroshan.illangakoon25@altrium.com', q: 'Q2', team: 'IT Support and Operations' },
      { name: 'Sumith Mendis', email: 'sumith.mendis26@altrium.com', q: 'Q3', team: 'IT Support and Operations' },
      { name: 'Nimal Hettiarachchi', email: 'nimal.hettiarachchi27@altrium.com', q: 'Q1', team: 'IT Support and Operations' },
      { name: 'Harsha Ekanayake', email: 'harsha.ekanayake28@altrium.com', q: 'Q2', team: 'IT Support and Operations' },
      { name: 'Pathum Silva', email: 'pathum.silva29@altrium.com', q: 'Q3', team: 'IT Support and Operations' },
      { name: 'Udara Gunaratne', email: 'udara.gunaratne30@altrium.com', q: 'Q1', team: 'IT Support and Operations' },

      // Cyber Security
      { name: 'Oshan Jayawardena', email: 'oshan.jayawardena31@altrium.com', q: 'Q1', team: 'Cyber Security' },
      { name: 'Ashan Gunaratne', email: 'ashan.gunaratne32@altrium.com', q: 'Q2', team: 'Cyber Security' },
      { name: 'Tharusha Goonewardena', email: 'tharusha.goonewardena33@altrium.com', q: 'Q3', team: 'Cyber Security' },
      { name: 'Namal Senadheera', email: 'namal.senadheera34@altrium.com', q: 'Q1', team: 'Cyber Security' },
      { name: 'Milinda Senadheera', email: 'milinda.senadheera35@altrium.com', q: 'Q2', team: 'Cyber Security' },
      { name: 'Suresh Jayakody', email: 'suresh.jayakody36@altrium.com', q: 'Q3', team: 'Cyber Security' },
      { name: 'Supun Silva', email: 'supun.silva37@altrium.com', q: 'Q1', team: 'Cyber Security' },
      { name: 'Udara Wickramasinghe', email: 'udara.wickramasinghe38@altrium.com', q: 'Q2', team: 'Cyber Security' },
      { name: 'Menuka Senanayake', email: 'menuka.senanayake39@altrium.com', q: 'Q3', team: 'Cyber Security' },
      { name: 'Oshada Hettiarachchi', email: 'oshada.hettiarachchi40@altrium.com', q: 'Q1', team: 'Cyber Security' },

      // UI/UX
      { name: 'Pathum Weerasinghe', email: 'pathum.weerasinghe41@altrium.com', q: 'Q1', team: 'UI/UX' },
      { name: 'Sanka Gunawardena', email: 'sanka.gunawardena42@altrium.com', q: 'Q2', team: 'UI/UX' },
      { name: 'Oshada Rajapaksa', email: 'oshada.rajapaksa43@altrium.com', q: 'Q3', team: 'UI/UX' },
      { name: 'Lasantha Herath', email: 'lasantha.herath44@altrium.com', q: 'Q1', team: 'UI/UX' },
      { name: 'Pradeep Herath', email: 'pradeep.herath45@altrium.com', q: 'Q2', team: 'UI/UX' },
      { name: 'Malith Senadheera', email: 'malith.senadheera46@altrium.com', q: 'Q3', team: 'UI/UX' },
      { name: 'Madhuka Goonewardena', email: 'madhuka.goonewardena47@altrium.com', q: 'Q1', team: 'UI/UX' },
      { name: 'Gihan Herath', email: 'gihan.herath48@altrium.com', q: 'Q2', team: 'UI/UX' },
      { name: 'Dasun Wijesinghe', email: 'dasun.wijesinghe49@altrium.com', q: 'Q3', team: 'UI/UX' },
      { name: 'Madhuka Peiris', email: 'madhuka.peiris50@altrium.com', q: 'Q1', team: 'UI/UX' },

      // Accounting
      { name: 'Sanduni Fernando', email: 'sanduni.fernando@altrium.com', q: 'Q1', team: 'Accounting' },
      { name: 'Geeth Edirisinghe', email: 'geeth.edirisinghe52@altrium.com', q: 'Q2', team: 'Accounting' },
      { name: 'Ranil Abeysekara', email: 'ranil.abeysekara53@altrium.com', q: 'Q3', team: 'Accounting' },
      { name: 'Nuwan Liyanage', email: 'nuwan.liyanage54@altrium.com', q: 'Q1', team: 'Accounting' },
      { name: 'Avishka Illangakoon', email: 'avishka.illangakoon55@altrium.com', q: 'Q2', team: 'Accounting' },
      { name: 'Namal Amarasiri', email: 'namal.amarasiri56@altrium.com', q: 'Q3', team: 'Accounting' },
      { name: 'Vishwa Ekanayake', email: 'vishwa.ekanayake57@altrium.com', q: 'Q1', team: 'Accounting' },
      { name: 'Bhanuka Liyanage', email: 'bhanuka.liyanage58@altrium.com', q: 'Q2', team: 'Accounting' },
      { name: 'Menuka Wickramasinghe', email: 'menuka.wickramasinghe59@altrium.com', q: 'Q3', team: 'Accounting' },
      { name: 'Madhuka Karunanayake', email: 'madhuka.karunanayake60@altrium.com', q: 'Q1', team: 'Accounting' },

      // Financial Analysis
      { name: 'Ruwan Jayasinghe', email: 'ruwan.jayasinghe@altrium.com', q: 'Q1', team: 'Financial Analysis' },
      { name: 'Akesh Goonewardena', email: 'akesh.goonewardena62@altrium.com', q: 'Q2', team: 'Financial Analysis' },
      { name: 'Pathum Dissanayake', email: 'pathum.dissanayake63@altrium.com', q: 'Q3', team: 'Financial Analysis' },
      { name: 'Mahela Jayasooriya', email: 'mahela.jayasooriya64@altrium.com', q: 'Q1', team: 'Financial Analysis' },
      { name: 'Gihan Kaluarachchi', email: 'gihan.kaluarachchi65@altrium.com', q: 'Q2', team: 'Financial Analysis' },
      { name: 'Ruwan Liyanage', email: 'ruwan.liyanage66@altrium.com', q: 'Q3', team: 'Financial Analysis' },
      { name: 'Maneesha Jayatilake', email: 'maneesha.jayatilake67@altrium.com', q: 'Q1', team: 'Financial Analysis' },
      { name: 'Vishwa Subasinghe', email: 'vishwa.subasinghe68@altrium.com', q: 'Q2', team: 'Financial Analysis' },
      { name: 'Milinda Nanayakkara', email: 'milinda.nanayakkara69@altrium.com', q: 'Q3', team: 'Financial Analysis' },
      { name: 'Malith Karunanayake', email: 'malith.karunanayake70@altrium.com', q: 'Q1', team: 'Financial Analysis' },

      // Finance Operations
      { name: 'Indika De Silva', email: 'indika.desilva71@altrium.com', q: 'Q1', team: 'Finance Operations' }, // fixed space in email
      { name: 'Pathum Herath', email: 'pathum.herath72@altrium.com', q: 'Q2', team: 'Finance Operations' },
      { name: 'Dhananjaya Welgama', email: 'dhananjaya.welgama73@altrium.com', q: 'Q3', team: 'Finance Operations' },
      { name: 'Kosala Athauda', email: 'kosala.athauda74@altrium.com', q: 'Q1', team: 'Finance Operations' },
      { name: 'Dimuthu Silva', email: 'dimuthu.silva75@altrium.com', q: 'Q2', team: 'Finance Operations' },
      { name: 'Oshada Peiris', email: 'oshada.peiris76@altrium.com', q: 'Q3', team: 'Finance Operations' },
      { name: 'Shanaka Ekanayake', email: 'shanaka.ekanayake77@altrium.com', q: 'Q1', team: 'Finance Operations' },
      { name: 'Sanath Rodrigo', email: 'sanath.rodrigo78@altrium.com', q: 'Q2', team: 'Finance Operations' },
      { name: 'Dulshan Rajapaksa', email: 'dulshan.rajapaksa79@altrium.com', q: 'Q3', team: 'Finance Operations' }
    ];

    const employees = employeesData.map(emp => {
      const tm = tmMap[emp.team];
      return {
        name: emp.name,
        email: emp.email,
        password: defaultPassword,
        plain_password: '12345678',
        role: 'employee',
        quarter_batch: emp.q,
        department: tm.department,
        team: tm.team,
        manager_id: tm.id,
        login_count: 0
      };
    });

    await User.bulkCreate(employees);

    console.log('✅ Database seeded successfully with explicit company roster!');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
  } finally {
    process.exit(0);
  }
};

seedData();
